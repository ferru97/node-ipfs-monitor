/*
Description: Script used to create a connection to the SQL database and store the monitoring informations
Author: Ferrulli Vito
*/


var mysql = require('mysql');

function connectDB(Host,Port,User,Password,Database) {
    connection = mysql.createConnection({
        host: Host,
        port: Port,
        user: User,
        password: Password,
        database: Database,
        multipleStatements: true
        });
    
        connection.connect(function(err) {
        if (err){
            console.log("Mysql connection error: "+err.toString());
            throw err;
        }  
        else{
            console.log("DB Connected!");
        }    
    });
    return connection
}


function saveDHTcheck(DBconn,buckets,total_peers,distinct_peer,queried_peer,notEmpty_peer){

    var time = new Date().toISOString().slice(0, 19).replace('T', ' ');
    var sql = `INSERT INTO dhtt_check VALUES('DEFAULT','${time}','${parseInt(total_peers)}','${parseInt(distinct_peer)}','${parseInt(queried_peer)}','${parseInt(notEmpty_peer)}')`
    DBconn.query(sql ,(err, result, fields) => {
        if (err) throw err;
        var insert_id = result.insertId;

        DBconn.query("SELECT id FROM dhtt_bucket ORDER BY id DESC LIMIT 1 " ,(err, result, fields) => {
            var last_id = result.length>0 ? parseInt(result[0].id)+1 : 1
            for (var key in buckets) {
                if (buckets.hasOwnProperty(key) && buckets[key].length>0) {  
                    var cids = buckets[key]
                    var sql = `INSERT INTO dhtt_bucket VALUES('${last_id}','${insert_id}','${key}','${buckets[key].length}');`
                    sql += ` INSERT INTO dhtt_peer VALUES('DEFAULT','${last_id}','${cids[0]}')`
                    for(var i=1; i<cids.length; i++)
                         sql += `,('DEFAULT','${last_id}','${cids[i]}')`
                    sql+=";"
    
                    DBconn.query(sql,(err, result, fields) => {
                        if (err) throw err;
                    });
                    last_id++;
                }
            }
        })
    });
}



function saveSWARMcheck(DBconn,cid,multi_add,ip_fam,ip_add,port,location,peer_latency,direction,time,lastCheck) {

    DBconn.query(`SELECT cid FROM swarm_peer WHERE cid='${cid}'`, function (err, result, fields) {
        if (err) Console.log("SQL error: SELECT cid swarm_peer");
        if(result.length <= 0){
            DBconn.query(`INSERT INTO swarm_peer VALUES ('${cid}')`, function (err, result, fields) {
                if (err) Console.log("SQL error: Insert swarm_peer");
            });
            var sql = `INSERT INTO swarm_connection VALUES ('DEFAULT','${cid}','${multi_add}','${time}','${time}','${ip_fam}','${ip_add}','${port}','${location}','${peer_latency}','${direction}')`;
            DBconn.query(sql, function (err, result, fields) {if (err) Console.log("SQL error: Insert swarm_connection");});
        }else{
            var sql = `SELECT id FROM swarm_connection WHERE peer='${cid}' AND end_time='${lastCheck}' LIMIT 1`;
            DBconn.query(sql, function (err, result, fields) {
                if (err) Console.log("SQL error: SELECT id FROM swarm_connection");
                else{
                   if(result.length>0){
                    var id = result[0].id
                    sql = `UPDATE swarm_connection SET end_time='${time}' WHERE id='${id}' `;
                    DBconn.query(sql, function (err, result, fields) {if (err) Console.log("SQL error: UPDATE swarm_connection")});
                    }else{
                        var sql = `INSERT INTO swarm_connection VALUES ('DEFAULT','${cid}','${multi_add}','${time}','${time}','${ip_fam}','${ip_add}','${port}','${location}','${peer_latency}','${direction}')`;
                        DBconn.query(sql, function (err, result, fields) {if (err) Console.log("SQL error: INSERT swarm_connection")});    
                    } 
                } 
            });
        }
    });
}


function sqlDate(){
    function twoDigits(str){
        if(str.toString().length==1)
            return "0"+str
        else
            return str
    }

    var currentdate = new Date(); 
    var datetime = + twoDigits(currentdate.getFullYear()) + "-" 
                   + twoDigits((currentdate.getMonth()+1))  + "-"  
                   + twoDigits(currentdate.getDate()) + " "
                   + twoDigits(currentdate.getHours()) + ":"  
                   + twoDigits(currentdate.getMinutes()) + ":" 
                   + twoDigits(currentdate.getSeconds());
    return datetime
}


module.exports = {
    connectDB: connectDB,
    saveSWARMcheck: saveSWARMcheck,
    saveDHTcheck: saveDHTcheck,
    sqlDate: sqlDate,
}


