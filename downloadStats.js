/*
Description: Script used for the 'get-stats' command used to create a res 
             folder on the project root directory and download the monitor's statistics as xls files
Author: Ferrulli Vito
*/



var fs = require('fs');
var json2xls = require('json2xls');

const dir = "./stats"
var db = null;

function connectionsDistribution(){
    db.query("SELECT start_time, UNIX_TIMESTAMP(start_time) as timestamp FROM swarm_connection ORDER BY start_time ASC ", function (err, result, fields) {
        if (err) throw err
        var res = []
        var c = -1;
        var last_timestamp = null;

        const five_min = 900

        var i = 0;
        while(i<result.length){
            if(i!=0 && parseInt(result[i].timestamp) - last_timestamp <= five_min){
                res[c].Peers_num++
                i++
            }else{
                c++
                var time = result[i].start_time.toString() 
                res[c] = {Time: time.substring(0, 24), Peers_num: 1}
                last_timestamp = parseInt(result[i].timestamp)
                if(i==0) i++
            }
        }
        var xls = json2xls(res);
        fs.writeFileSync('./stats/SWARM_connections_distribution.xlsx', xls, 'binary');
    });
}


function countriesDistribution(){  
    var sql = "SELECT location, COUNT(location) as num FROM (SELECT DISTINCT peer,location FROM swarm_connection WHERE location!='') AS T GROUP BY location";
    db.query(sql, function (err, result, fields) {
        if (err) throw err
        var xls = json2xls(result);
        fs.writeFileSync('./stats/SWARM_countries_distribution.xlsx', xls, 'binary');
    });
}

function portsDistribution(){  
    var sql = "SELECT ip_port AS Port, COUNT(ip_port) as Num FROM swarm_connection GROUP BY port ORDER BY Num DESC";
    db.query(sql, function (err, result, fields) {
        if (err) throw err
        var xls = json2xls(result);
        fs.writeFileSync('./stats/SWARM_ports_distribution.xlsx', xls, 'binary');
    });
}

function directionDistribution(){  
    var sql = "SELECT direction, COUNT(direction) as Num FROM swarm_connection WHERE direction!='' GROUP BY direction";
    db.query(sql, function (err, result, fields) {
        if (err) throw err
        var xls = json2xls(result);
        fs.writeFileSync('./stats/SWARM_directions_distribution.xlsx', xls, 'binary');
    });
}

function cidTypes(){  
    var sql = "SELECT DISTINCT SUBSTRING(peer, 1, 2) as type,COUNT(*) as num, peer as example FROM swarm_connection GROUP BY type";
    db.query(sql, function (err, result, fields) {
        if (err) throw err
        var xls = json2xls(result);
        fs.writeFileSync('./stats/SWARM_cids_type.xlsx', xls, 'binary');
    });
}

function latencyDistribution(){
    var sql = "SELECT latency FROM swarm_connection WHERE latency!='n/a' ORDER BY `swarm_connection`.`latency` ASC";
    var ms_step = 10
    db.query(sql, function (err, result, fields) {
        if (err) throw err

        var res = []

        var c = 0
        var last_latency = parseInt((result[0].latency.split('.'))[0])
        res[0] = {latency: "0-10ms", num: 1}

        var i = 1
        while(i<result.length){
            var lat = parseInt((result[i].latency.split('.'))[0])
            if(lat < last_latency+ms_step){
                res[c].num++
                i++
            }else{
                c++
                res[c] = {latency: (lat-ms_step)+"-"+lat+"ms", num: 1}
                last_latency = parseInt((result[i].latency.split('.'))[0])
            }
        }

        var xls = json2xls(res);
        fs.writeFileSync('./stats/SWARM_latency_distribution.xlsx', xls, 'binary');
    });
}

function connectionDuration(){
    var sql = "SELECT (UNIX_TIMESTAMP(end_time)-UNIX_TIMESTAMP(start_time)) AS duration FROM swarm_connection ORDER BY duration ASC";
    db.query(sql, function (err, result, fields) {
        if (err) throw err

        var sec_step = 30
        var res = []
        var c = -1
        var i = 0

        var limit = 0;
        while(i<result.length){
            if(c==-1 || parseInt(result[i].duration)>parseInt(res[c].duration.substring(0,res[c].duration.length))){
                c++
                res[c] = {duration:parseInt(result[i].duration)+sec_step+"sec", num:1}
            }else{
                res[c].num++
                i++
            }
        }

    
        var xls = json2xls(res);
        fs.writeFileSync('./stats/SWARM_conn_duration_distribution.xlsx', xls, 'binary');
    });
}


function num_peer_retrieved(){  
    var sql = "SELECT distinct_peer FROM dhtt_check ORDER BY distinct_peer ASC ";
    db.query(sql, function (err, result, fields) {
        if (err) throw err
        
        var group_size = 10
        var res = []
        var i = 0;
        
        var limit = result[0].distinct_peer+group_size

        var c = 0;
        res[c] = {x:limit-10+"-"+limit, y:0}
        while(i<result.length){
            if(result[i].distinct_peer<=limit){
                res[c].y++
                i++
            }else{
                limit+=group_size
                c++;
                res[c] = {x:limit-10+"-"+limit, y:0}
            }
        }
        

        var xls = json2xls(res);
        fs.writeFileSync('./stats/DHT_num_peers_retrieved.xlsx', xls, 'binary');
    });
}

function duplicates_peer_retrieved(){  
    var sql = "SELECT total_peer,distinct_peer FROM dhtt_check";
    db.query(sql, function (err, result, fields) {
        if (err) throw err
        var xls = json2xls(result);
        fs.writeFileSync('./stats/DHT_duplicates_peers_retrieved.xlsx', xls, 'binary');
    });
}

function lookup_queried_peer(){  
    var sql = "SELECT queried_peer FROM dhtt_check ORDER BY queried_peer ASC";
    db.query(sql, function (err, result, fields) {
        if (err) throw err

        var group_size = 10
        var res = []
        var i = 0;
        
        var limit = result[0].queried_peer+group_size

        var c = 0;
        res[c] = {x:limit-10+"-"+limit, y:0}
        while(i<result.length){
            if(result[i].queried_peer<=limit){
                res[c].y++
                i++;
            }else{
                limit+=group_size
                c++;
                res[c] = {x:limit-10+"-"+limit, y:0}
            }
            
        }

        var xls = json2xls(res);
        fs.writeFileSync('./stats/DHT_lookup_queried_peer.xlsx', xls, 'binary');
    });
}

function buckets_popularity(){
    var sql = "SELECT bucket, AVG(peers_num) as peers_mean, STDDEV(peers_num) as peers_std FROM dhtt_bucket GROUP BY bucket ORDER BY bucket ASC";
    db.query(sql, function (err, result, fields) {
        if (err) throw err
        var xls = json2xls(result);
        fs.writeFileSync('./stats/DHT_buckets_popularity.xlsx', xls, 'binary');
    });
}    


function buckets_churn(){
    var sql = "SELECT DISTINCT bucket FROM dhtt_bucket"
    db.query(sql, function (err, result, fields) {
        if (err) throw err

        for(var k=0; k<result.length; k++){
            var bucket = result[k].bucket

            var sql2 = `SELECT dhtt_check.id AS id,bucket,cid, ${bucket} AS bc FROM (dhtt_check INNER JOIN dhtt_bucket ON dhtt_check.id=dhtt_bucket.id_check) INNER JOIN dhtt_peer ON dhtt_peer.id_bucket=dhtt_bucket.id WHERE bucket=`+bucket;
            db.query(sql2, function (err, result, fields) {
                if (err) throw err

                var last_check = []
                var check = []
                var last_id = result[0].id
                
                var res = []
                var c = 0
                res[0] = {x:c, y:0}

                var i = 0
                while(i<result.length){
                    if(last_id==result[i].id){
                        if(!last_check.includes(result[i].cid))
                            res[c].y++  
                        check.push(result[i].cid)
                        i++;
                    }else{
                        c++
                        res[c] = {x:c, y:0}
                        last_id=result[i].id
                        last_check = check.slice();
                        check = []
                    }
                }

                var xls = json2xls(res);
                fs.writeFileSync('./stats/DHT_bucket_'+result[0].bc+'_churn.xlsx', xls, 'binary');
            });
        }

    });

    
} 


function downloadStats(DB){
    db = DB

    if (!fs.existsSync(dir))
        fs.mkdirSync(dir);

    connectionsDistribution()
    countriesDistribution()
    portsDistribution()
    directionDistribution()
    cidTypes()
    latencyDistribution()
    connectionDuration()


    num_peer_retrieved()
    duplicates_peer_retrieved()
    lookup_queried_peer()
    buckets_popularity()
    buckets_churn()

}


module.exports = {
    downloadStats: downloadStats
}

