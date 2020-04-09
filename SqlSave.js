var mysql = require('mysql');

function connectDB(Host,Port,User,Password,Database) {
    connection = mysql.createConnection({
        host: Host,
        port: Port,
        user: User,
        password: Password,
        database: Database
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

function saveDHTcheck(DBconn,buckets){

    var time = new Date().toISOString().slice(0, 19).replace('T', ' ');
    var sql = `INSERT INTO dhtt_check VALUES('DEFAULT','${time}')`;
    var insert_id = -1;
    DBconn.query(sql, (err, result, fields, insert_id) => {
        if (err) throw err;
        insert_id = result.insertId;
    });
    console.log("LAST ID_>"+insert_id)
   /* for (var key in buckets) {
        if (buckets.hasOwnProperty(key)) {           
            if(buckets[key]!=0){
                sql = `INSERT INTO dhtt_bucket VALUES('DEFAULT','${insert_id}','${key}','${buckets[key].length}')`;
                DBconn.query(sql, function (err, result, fields) {
                    if (err) throw err;
                    insert_id = result.insertId;
                });

                sql = `INSERT INTO dhtt_peer VALUES('DEFAULT','${insert_id}',${buckets[key][1]}')`;
                DBconn.query(sql, function (err, result, fields) {
                    if (err) throw err;
                });
            }
        }
    }*/
}


function saveSWARMcheck(DBconn,cid,multi_add,ip_fam,ip_add,port,location,peer_latency) {

    var time = new Date().toISOString().slice(0, 19).replace('T', ' ');
    DBconn.query(`SELECT cid FROM swarm_peer WHERE cid='${cid}'`, function (err, result, fields) {
        if (err) throw err;
        if(result.length <= 0){
            DBconn.query(`INSERT INTO swarm_peer VALUES ('${cid}')`, function (err, result, fields) {
                if (err) throw err;
            });
            var sql = `INSERT INTO swarm_connection VALUES ('DEFAULT','${cid}','${multi_add}','${time}','${time}','${ip_fam}','${ip_add}','${port}','${location}','${peer_latency}')`;
            DBconn.query(sql, function (err, result, fields) {if (err) throw err;});
        }else{
            var sql = `SELECT id,end_time FROM swarm_connection WHERE peer='${cid}' ORDER BY end_time DESC LIMIT 1 `;
            DBconn.query(sql, function (err, result, fields) {
                if (err) throw err;
                var time_diff_min = differenceMinutes(result[0].end_time,time);
                if(result.length>0 && time_diff_min <= 10){
                    var id = result[0].id
                    sql = `UPDATE swarm_connection SET end_time='${time}' WHERE id='${id}' `;
                    DBconn.query(sql, function (err, result, fields) {if (err) throw err;});
                }else{
                    var sql = `INSERT INTO swarm_connection VALUES ('DEFAULT','${cid}','${multi_add}','${time}','${time}','${ip_fam}','${ip_add}','${port}','${location}','${peer_latency}')`;
                    DBconn.query(sql, function (err, result, fields) {if (err) throw err;});    
                }
            });
        }
    });
}


function differenceMinutes(startDate, endDate ){
    var timeStart = new Date(startDate).getTime();
    var timeEnd = new Date(endDate).getTime();
    var minDiff = (timeEnd - timeStart) / 60 / 1000;
    return Math.abs(minDiff);
}

module.exports = {
    connectDB: connectDB,
    saveSWARMcheck: saveSWARMcheck,
    saveDHTcheck: saveDHTcheck
}


