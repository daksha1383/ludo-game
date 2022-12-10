var mysql = require('mysql');
//const bcrypt = require("bcrypt");


// app.use(express.json())

// app.post("/registration", async (req, res) => {
//     const Username = req.body.username;

//     const hashedPassword = await bcrypt.hash(req.body.password,10);

//     db.getConnection( async (err, connection) => {
//         if(err) throw (err) 
        
//         const sqlSearch = "SELECT * FROM accounts WHERE username = ?"
//         const search_query = mysql.format(sqlSearch,[username])

//         const sqlInsert = "INSERT INTO accounts VALUES (0,?,?)"
//         const insert_query = mysql.format(sqlInsert, [username, hashedPassword])

//         await connection.query (search_query, async (err, res) => {

//             if (err) throw (err)
//             console.log("----> Search Results")
//             console.log(res.length)

//             if(res.length != 0){
//                 connection.release()
//                 console.log("----> User Already Exists")
//                 res.sendStatus(409)
//             }
//             else {
//                 await connection.query (insert_query, (err, result)=> {
//                     connection.release()
//                     if (err) throw (err)
//                     console.log ("--------> Created new User")
//                     console.log(result.insertId)
//                     res.sendStatus(201)
//                    })
//                 }
//         })
//     })
// })

var connection = mysql.createConnection({
    host: "localhost",
    user:"root", 
    password:"password",
    database:"nodelogin"
});

connection.connect(function(err) {
    if (!!err) {
        console.log(err);
    }
    else {
        console.log('Connected');
    }
});
module.exports = connection;