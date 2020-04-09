
const IPFS = require('ipfs')
var mysql = require('mysql');
var sleep = require('sleepjs');


async function main () {

    const ipfs = await IPFS.create({

      libp2p: { 
        config: {
          dht: {
            enabled: true
          }  
        }
      }
    })
    var my_cid = await ipfs.id();

  for await (const info of ipfs.dht.query(my_cid)) {
    var peer_cid = new CID(info.id);
    console.log(peer_cid.toString())

  }
    
  }


main()