# IPFS Monitor
A JavaScript based IPFS monitor tool used to monitor the IPFS swarm and DHT

### Requirements
- **Node.js** JavaScript runtime
- **go-ipfs** mplementation of IPFS downloadable from https://dist.ipfs.io/#go-ipfs
- **SQL Database** to save the monitoring results

### How to use
- Go in the root directory of the tool and download the dependencies with `npm install`
- Start the ipfs daemon with `ipfs daemon` command
- Start the monitoring with the **monitor** command from the **index.js** script, giving the required arguments. Use `ipfs monitor --help` for more info

Example: `node index.js monitor --IPFSmultiadd="/ip4/127.0.0.1/tcp/5001" --DBhost="localhost" --DBport="3308" --DBuser="root" --DBpsw="1234" --DBname="ipfs_monitor`
