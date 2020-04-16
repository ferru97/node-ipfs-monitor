/*
Description: Script responsable for the monitoring
Author: Ferrulli Vito
*/


const ipfsClient = require('ipfs-http-client')
var sleep = require('sleepjs');
var geoip = require('geoip-lite');
const multiaddr = require('multiaddr')
var multihash = require('multihashes')
const CID = require('cids')
var hexToBinary = require('hex-to-binary');
var DB = require('./SqlSave')
var Stats = require('./downloadStats')
const yargs = require("yargs")
var sha256 = require('js-sha256');


//Function that retrun the current datetime
function getTime(){
  var currentdate = new Date(); 
  var datetime = currentdate.getDate() + "/"
                + (currentdate.getMonth()+1)  + "/" 
                + currentdate.getFullYear() + " @ "  
                + currentdate.getHours() + ":"  
                + currentdate.getMinutes() + ":" 
                + currentdate.getSeconds();
  return datetime
}


/*
Description:Function used to compute the common prefix length between a peer id
            and a list of peers returned by the DHT query
Input: -peer_id = binary representation of the peer's multhihash relative to the 
                  peer used for the DHT QUERY
            type: String
       -peers_list - list of peers returned by th dht query with whitch caalculate
                    the common prefix length
            type = [[String1,String2]] where String1 is the binary representation
                  of a peer's multihash and String2 its CID
Output: -dictionary: A dictionary in the form {int,[String]} where int is a number
                    identifying a common prefix length and [String] is the list of
                    CIDs belonging to peers thath had had a common prefix length=int
*/
function commonPrefixLength(peer_id, peers_list){
  var dictionary = {};
  var k = 256;
  while(k>0){
    dictionary[(k).toString()] = []
    for (var i=0; i<peers_list.length; i++){
      var temp = peers_list[i]
      if(temp[0]!="-" && temp[0].substring(0,k)==peer_id.substring(0,k)){
        dictionary[(k).toString()].push(temp[1])
        temp[0] = "-"
        peers_list[i] = temp
      } 
    }
    k--;
  }
  return dictionary;
}


  var lastCheck = "00-00-0000 00:00:00";
  /*
  Description: Function used to monitor the ipfs swarm
  Input: -ipfs: reference to the ipfs client
         -db: referenct to a sql database connectionused to save the monitoring results
  */
  async function monitorSwarm(ipfs,db){

  var SQLtime = DB.sqlDate();
  try{
    const peersInfos = await ipfs.swarm.peers({verbose:true,latency:true,direction:true}) //call the IPFS SWARM PEERS command
    peersInfos.forEach(peer => {

      var peer_id = peer.peer
      var multiadd, peer_ip, peer_ip_fam, peer_ip_port,direction = ""
      try{
        //get the IP informations from the multiaddress
        multiadd = multiaddr(peer.addr)
        peer_ip = multiadd.nodeAddress().address
        peer_ip_fam = multiadd.nodeAddress().family
        peer_ip_port = multiadd.nodeAddress().port
        direction = peer.direction
      }catch(error){console.log(`Multiaddress error -> ${peer.addr}`)}
    
      var peer_loc = ""
      try{peer_loc = geoip.lookup(peer_ip).country}catch(error){} //locate the ip location with the geoip-lite library
      

      DB.saveSWARMcheck(db,peer_id,peer.addr,peer_ip_fam,peer_ip,peer_ip_port,peer_loc,peer.latency,direction,SQLtime,lastCheck); //save the result on the DB

    })
    lastCheck = SQLtime
    console.log(`SWARM SIZE -> ${peersInfos.length}`)
  }catch(error){Console.log("Monitor swarm error")}

}


 /*
  Description: Function used to monitor the ipfs DHT
  Input: -ipfs: reference to the ipfs client
         -db: referenct to a sql database connectionused to save the monitoring results
         -my_cid: cid of the current client used for the "DHT QUERY CID" command
  */
async function monitorDHTtable(ipfs,db,my_cid){
  
  const cid = new CID(my_cid)
  //var hash = sha256.create();
  //var multiH  = multihash.decode(cid.multihash,'hex')
  //var cid_sha = hash.update(multiH.digest.toString('hex')).hex()
  var cid_bin = hexToBinary(cid.multihash.toString('hex')) //calculate the binary of the cid                 
                                                           //use hexToBinary(peer_sha) if you want to try the sha256(id) XOR method
  var peers_list = []; //list of distinct peer retreived
  var peers_found = {} //dictionary of peer retreived, used to avoid duplicates
  var count = 0;
  var queried_peer = 0
  var notEmpty_peer = 0
  try{
    for await (const info of ipfs.dht.query(my_cid)) { //call the "IPFS DHT QUERY my_cid" command
      queried_peer++;
      if(info.responses.length > 0)
        notEmpty_peer++;
      for(var k=0; k<info.responses.length; k++){
        var peer_cid = new CID(info.responses[k].id);
        //var hash2 = sha256.create();
        //var multiH2  = multihash.decode(peer_cid.multihash, 'hex')
        //var peer_sha = hash2.update(multiH2.digest.toString('hex')).hex()
        var peer_bin = hexToBinary(peer_cid.multihash.toString('hex')) //calculate the binary of the returned peer's cid                 
                                                                      //use hexToBinary(peer_sha) if you want to try the sha256(id) XOR method
        
        if(!peers_found.hasOwnProperty(peer_cid.toString())){ //since the command return many duplicates, we keep only distinct peer 
          peers_found[peer_cid.toString()] = "true";
          peers_list.push([peer_bin,peer_cid.toString()])
        }
        count++;
      }
    }
  
  
    console.log(`QUERY DHT PEERS -> ${count} (DISTINCT ${peers_list.length})`)
    var buckets = commonPrefixLength(cid_bin,peers_list)

  }catch(error){console.log("Monitor dht error")}

  DB.saveDHTcheck(db,buckets,count,peers_list.length,queried_peer,notEmpty_peer)// save the result on the DB
}

/*
Description: main function that start the monitoring
Input: IPFSdaemon - multiaddress of the ipfs daemon server
       DBhost,DBport,DBuser,DBpsw,DBname - database credentials
       interval: intervals in seconds between monitoring sessions
*/
async function main (IPFSdaemon,DBhost,DBport,DBuser,DBpsw,DBname,interval) {
    interval = interval * 60000 //intervals in millisec between monitoring sessions
    var db = DB.connectDB(DBhost,DBport,DBuser,DBpsw,DBname) //connect to the db

    const ipfs = ipfsClient(IPFSdaemon)
    var node_cid = await ipfs.id();// client cid

    while(1) {
        console.log("New check: "+getTime())
        await Promise.all([monitorSwarm(ipfs,db), monitorDHTtable(ipfs,db,node_cid.id)]);

        console.log("-------------------------------------------")
        await sleep.sleep(interval);
    };
    
  }


//Script 'monitor' command definition  
yargs.command({
  command: 'monitor',
  describe: 'Monitor the IPFS connections and save the data on a SQL DB',
  builder:{
    IPFSmultiadd: {
      describe: 'Multiaddress of the IPFS daemon server',
      demandOption: true,
      type: 'string'
    },
    DBhost: {
      describe: 'SQL Database address',
      demandOption: true,
      type: 'string'
    },
    DBport: {
      describe: 'SQL Database server port',
      demandOption: true,
      type: 'string'
    },
    DBuser: {
      describe: 'SQL Database user',
      demandOption: true,
      type: 'string'
    },
    DBpsw: {
      describe: 'SQL Database password',
      demandOption: true,
      type: 'string'
    },
    DBname: {
      describe: 'SQL Database name',
      demandOption: true,
      type: 'string'
    },
    checkInterval: {
      describe: 'Sleep interval between checks in minutes (Default 3)',
      default: 3,
      type: 'int'
    }
  },
  handler: function(argv){
    main(argv.IPFSmultiadd,argv.DBhost,argv.DBport,argv.DBuser,argv.DBpsw,argv.DBname,argv.checkInterval)
    console.log("Monitor started!")
  }
})

//Script 'get-stats' command definition
yargs.command({
  command: 'get-stats',
  describe: "Create a res folder on the project root directory and download the monitor's statistics as xls files",
  builder:{
    DBhost: {
      describe: 'SQL Database address',
      demandOption: true,
      type: 'string'
    },
    DBport: {
      describe: 'SQL Database server port',
      demandOption: true,
      type: 'string'
    },
    DBuser: {
      describe: 'SQL Database user',
      demandOption: true,
      type: 'string'
    },
    DBpsw: {
      describe: 'SQL Database password',
      demandOption: true,
      type: 'string'
    },
    DBname: {
      describe: 'SQL Database name',
      demandOption: true,
      type: 'string'
    }
  },
  handler: function(argv){
    var db = DB.connectDB(argv.DBhost,argv.DBport,argv.DBuser,argv.DBpsw,argv.DBname)
    Stats.downloadStats(db);
  }
})

yargs.version("0.1")
yargs.parse()

//node index.js monitor --IPFSmultiadd="/ip4/127.0.0.1/tcp/5001" --DBhost="localhost" --DBport="3308" --DBuser="root" --DBpsw="" --DBname="ipfs_monitor"

