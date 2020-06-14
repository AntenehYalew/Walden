// jshint esversion:6

const express = require("express"),
      app     = express(),
      axios   = require("axios"),
      mysql   = require("mysql");

//Connect  local DB to the APP
var con = mysql.createConnection({
    host     : 'localhost',
    user     : '******',
    password : '******',
    database : 'walden_interview'
});

con.connect((err)=> {
    if (err) {
      console.error('Database connection failed: ' + err);
      return;
    }
    console.log('Connected to local MySql database.');
  });


//ALTER members table to add a new column

con.query(`SELECT 
IF (COUNT(*)=1, "Exist","Not Exist") AS Column_Check
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'walden_interview' 
AND TABLE_NAME = 'members'
AND COLUMN_NAME = 'sticky_preferences' `,(err,response)=>{
    if(!err){
        if(response[0].Column_Check === "Not Exist"){
            con.query("ALTER TABLE members ADD COLUMN sticky_preferences VARCHAR(255)",(err,newColumn)=>{
                if(!err){
                    console.log("New Column Added")
                }
            })
        }else{
            console.log("COLUMN 'sticky_preferences' EXISTS")
        }
    }else{
        console.log(err)
    }

})

//Routes

//Route "/"
//Retrive Sticky-Preferences from the staging API 

 app.get("/",async (req,res)=>{
    const WaldenStickyPreferences = await axios({
        method:"GET",
        url:"https://api.staging.waldenlocalmeat.com/sticky-preferences",
        data:{
         token: 'walden.eyJpc3MiOiJ2MS41IiwiZXhwIjoxNTkyMTU2MDE4LCJuYmYiOjE1OTIwNjk2MTgsImlhdCI6MTU5MjA2OTYxOCwidXNlciI6InlhbGV3YW50ZW5laHRhZGVzc2VAZ21haWwuY29tIiwidXNlcklkIjo0MjY1MiwiYWNjZXNzIjoibWVtYmVyIiwiZmlyc3ROYW1lIjoiQW50ZW5laCIsImxhc3ROYW1lIjoiWWFsZXciLCJhcGkiOmZhbHNlLCJhcGlWZXJzaW9uIjoiMjIuMy41OS1ERVZFTE9QTUVOVCIsInVuaXF1ZSI6ImIxZGE3NjgxZTgzZCIsInJlZnJlc2giOmZhbHNlLCJjYW5jZWxsZWQiOmZhbHNlLCJmYWlsZWQiOmZhbHNlLCJ0aWQiOjM3MDAyM30=.NDI0MDgxY2Q4NWZjMGNkNWY5ZDA5MjkzODgyNmFhYzJkNDc2MDc1NGJmMjJjNGQ4MjFmZTYyMjkwYTMzMGNmOGNjYzZkNjFiY2MwMTk0YTU4ZDc2NjRjMmJmMGU5NjlhMTIzMTcyNDM1ZTJkOTRmOWM2NmJmM2IyM2NlMmE5NDc='
        },
        headers: {
         "Content-Type": "application/json",
         },
    })

    WaldenStickyPreferences.data.sticky_preferences.map(preferences=>{
        if(preferences.inclusion === true){
            con.query(`SELECT * FROM members WHERE id = ${preferences.member}`,(err,selectedMember)=>{
                if(!err && selectedMember.length > 0 ){
                    con.query(`UPDATE members SET sticky_preferences = "${preferences.cut_details.name}" WHERE id = ${preferences.member}`,(err,Update)=>{
                        if(!err){
                            console.log("Sticky Preference Updated")
                        }else{
                            console.log(err)
                        }
                    })
                }else{
                    console.log(err)
                    console.log("Something went wrong. Please check your error message")
                }
            })
        }
    })

    res.send("Please check your console log")
}) 

//Run the script to retrive updated Data from the DB including claims report by the MX team on zendesk
//This is simply a showcase how the Mysql scripts will be incorporated in the route.
//In an actual work of an app/page, the route will either be rendered or redirected to a certain page with all the information.

app.get("/UpdatedZendeskReport" , (req,res)=>{
    con.query(`
    SELECT zd.zendesk_data_id AS zendex_id,zd.customer_email AS customer_email, TIMESTAMP(zd.date_of_complaint) AS date_of_complaint,zd.pack_date_guess AS possible_packed_date, 
        m.id AS member_id, o.id AS order_id, o.status, o.packed_at, o.delivered_at, o.notes, m.sticky_preferences
        FROM zendesk_data zd
        INNER JOIN members m
        ON m.email = zd.customer_email
        INNER JOIN orders o
        ON o.member = m.id
        INNER JOIN (
        SELECT zd.zendesk_data_id, MAX(delivered.delivered_at)AS delivered_at
        FROM zendesk_data zd 
        INNER JOIN members m 
        ON zd.customer_email = m.email 
        INNER JOIN (SELECT o.member,o.id, o.delivered_at FROM orders o WHERE o.status = "delivered" ) delivered
        ON delivered.member = m.id 
            AND TIMESTAMP(zd.date_of_complaint) >= delivered.delivered_at
        GROUP BY zd.zendesk_data_id
        ORDER BY zd.zendesk_data_id
        ) sorted
        ON sorted.zendesk_data_id = zd.zendesk_data_id
        AND sorted.delivered_at = o.delivered_at
        ORDER by zd.zendesk_data_id
    `,(err,report)=>{
        if(!err){
            //Redirect the page with the detailed report
        }
    })
})
 

app.listen(3000, function(){
    console.log ("Connected to local port 3000");
})

