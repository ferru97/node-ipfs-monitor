
const ipfsClient = require('ipfs-http-client')
var sleep = require('sleepjs');
var geoip = require('geoip-lite');
const multiaddr = require('multiaddr')
var multihash = require('multihashes')
const CID = require('cids')
var hexToBinary = require('hex-to-binary');
var DB = require('./SqlSave')
const yargs = require("yargs")
var sha256 = require('js-sha256');


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


var lastCheck = null;
async function monitorSwarm(ipfs,db){

var SQLtime = DB.sqlDate();
const peersInfos = await ipfs.swarm.peers({verbose:true,latency:true,direction:true})
peersInfos.forEach(peer => {

  var peer_id = peer.peer
  var multiadd, peer_ip, peer_ip_fam, peer_ip_port,direction = ""
  try{
    multiadd = multiaddr(peer.addr)
    peer_ip = multiadd.nodeAddress().address
    peer_ip_fam = multiadd.nodeAddress().family
    peer_ip_port = multiadd.nodeAddress().port
    direction = peer.direction
  }catch(error){console.log(`Multiaddress error -> ${peer.addr}`)}
 
  var peer_loc = ""
  try{peer_loc = geoip.lookup(peer_ip).country}catch(error){}
  

  DB.saveSWARMcheck(db,peer_id,peer.addr,peer_ip_fam,peer_ip,peer_ip_port,peer_loc,peer.latency,direction,SQLtime,lastCheck);

})
lastCheck = SQLtime

console.log(`SWARM SIZE -> ${peersInfos.length}`)
}

async function monitorDHTtable(ipfs,db,my_cid){
  
  const cid = new CID("QmeSn1aFaDAtnM2ZjADu3F1LvuMsf63QGMRkd5hJjn8hZU")
  //var hash = sha256.create();
  //var multiH  = multihash.decode(cid.multihash,'hex')
  //var cid_sha = hash.update(multiH.digest.toString('hex')).hex()
  var cid_bin = hexToBinary(cid.multihash.toString('hex')) //hexToBinary(peer_sha) if we want to try the sha256(id) XOR method

  var peers_list = [];
  var peers_found = {}
  var count = 0;
  var queried_peer = 0
  var notEmpty_peer = 0
  for await (const info of ipfs.dht.query(my_cid)) {
    try{
      queried_peer++;
      if(info.responses.length > 0)
        notEmpty_peer++;
      for(var k=0; k<info.responses.length; k++){
        var peer_cid = new CID(info.responses[k].id);
        //var hash2 = sha256.create();
        //var multiH2  = multihash.decode(peer_cid.multihash, 'hex')
        //var peer_sha = hash2.update(multiH2.digest.toString('hex')).hex()
        var peer_bin = hexToBinary(peer_cid.multihash.toString('hex')) //hexToBinary(peer_sha) if we want to try the sha256(id) XOR method 
        
        if(!peers_found.hasOwnProperty(peer_cid.toString())){
          peers_found[peer_cid.toString()] = "true";
          peers_list.push([peer_bin,peer_cid.toString()])
        }
        count++;
      }
    }catch(error){console.log("Error DHT monitor")}
  }


  console.log(`QUERY DHT PEERS -> ${count} (DISTINCT ${peers_list.length})`)
  var buckets = commonPrefixLength(cid_bin,peers_list)
  /*for (var key in buckets) {
    if (buckets.hasOwnProperty(key)) {           
        if(buckets[key].length>0)
          console.log(key, buckets[key].length);
    }
  }*/
  DB.saveDHTcheck(db,buckets,count,peers_list.length,queried_peer,notEmpty_peer)
}

const ONE_MIN = 60000;
async function main (IPFSdaemon,DBhost,DBport,DBuser,DBpsw,DBname) {
    var db = DB.connectDB(DBhost,DBport,DBuser,DBpsw,DBname)

    const ipfs = ipfsClient(IPFSdaemon)
    var node_cid = await ipfs.id();

    while(1) {
        console.log("New check: "+getTime())
        await Promise.all([monitorSwarm(ipfs,db), monitorDHTtable(ipfs,db,node_cid.id)]);

        console.log("-------------------------------------------")
        await sleep.sleep(ONE_MIN);
    };
    
  }

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
    }
  },
  handler: function(argv){
    main(argv.IPFSmultiadd,argv.DBhost,argv.DBport,argv.DBuser,argv.DBpsw,argv.DBname)
    console.log("Monitor started!")
  }
})

yargs.version("0.1")
yargs.parse()

//node test2.js monitor --IPFSmultiadd="/ip4/127.0.0.1/tcp/5001" --DBhost="localhost" --DBport="3308" --DBuser="root" --DBpsw="" --DBname="ipfs_monitor"

