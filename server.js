//Modules block
const express = require('express');
const app = express();
const bodyParser = require('body-parser'); //Body-parser module
const cors = require('cors'); //CORS module
const axios = require('axios');
const request = require('request');//Module to make request to third party server from nodeJS server
const pug = require('pug');
const path = require('path');
const cheerio = require('cheerio'); //Jquery core library for server side
const cheerioTableparser = require('cheerio-tableparser'); //Cheerio module plugin to parse table
const mongoose = require('mongoose'); //Mongoose module
const cleanDeep = require('clean-deep'); //Clean objects empty values with keys
const moment = require('moment'); //moment.js npm





//Server settings(app.set) block
const port = 8000; //Server side listen port
app.set('view engine', 'pug'); //Just for development purpose
app.set('views', path.join(__dirname, 'views')); //Just for development purpose


//Middle(app.use) block (invoke everytime, when  will be request)
app.use(cors()); // Invoke CORS(Cross-Origin Resource Sharing) module always when , client  makes request to endpoints
app.use(bodyParser.json()); //Parse json


//Mongodb Atlas connection string
let atlasConnection =  'mongodb://crmadmin:berimor2136540HP@crmdb-shard-00-00-ilc2q.mongodb.net:27017,'+
                        'crmdb-shard-00-01-ilc2q.mongodb.net:27017,'+
                        'crmdb-shard-00-02-ilc2q.mongodb.net:27017/CRM?ssl=true&replicaSet=CrmDb-shard-0&authSource=admin';
//Mongoose schema statement
let Schema = mongoose.Schema;
//Mongoose data type check
let userSchema = new Schema({

    Name:  String,
    Last_name: String,
    Surname: String,
    Birth_date: Date,
    Region: String,
    Community: String,
    Street: String,
    Building: Number,
    Apartment: Number

});



//Endpoint to retrieve citizens list from  central election commission
app.post('/api/people',function (req,res) {

        // moment.js format requested client date value
        let  timeFormat= moment(req.body.citizenbirthDate).format('DD/MM/YYYY');
        function checkBirthDate(){
            if(timeFormat == 'Invalid date'){
                return '' // return empty string if invoked variable output ' invalid date ' string
            }else{
                return  timeFormat
            }
        };

        //Request module for posting values  into central election commission server
        request.post(
            //URL where need to make post
            {url:'http://www.elections.am/votersreg/',

                //Values of form which consistent is required from server side to answer to our request
                form: {

                    __EVENTTARGET:'',
                    __EVENTARGUMENT:'',
                    __VIEWSTATE:'/wEPDwUJOTUyNDkyMzQyZGRE8PYCJsYatSm9wKPEVlyiI8eIcA==', //If json will return 302 status code , update this value
                    __VIEWSTATEGENERATOR:'A173E3CD',
                    __EVENTVALIDATION:'/wEWNQL89oTmCAKG0fPDBgKG0cu3BgKG0d+4BgKQn7vmCwLRwpylAgLtn/WhDQL3qbjxDgKevLSdAwKLhbmfDQK3gNfdCwKogNfdCwKpgNfdCwKqgNfdCwKrgNfdCwKsgNfdCwKtgNfdCwKugNfdCwK/gNfdCwKwgNfdCwKogJfeCwKogJveCwKogJ/eCwKogKPeCwKogKfeCwKogKveCwKogK/eCwKogLPeCwKogPfdCwKogPvdCwKpgJfeCwKpgJveCwKpgJ/eCwKpgKPeCwKpgKfeCwKpgKveCwKpgK/eCwKpgLPeCwKpgPfdCwKpgPvdCwKqgJfeCwKqgJveCwKqgJ/eCwKqgKPeCwKqgKfeCwKqgKveCwKqgK/eCwKqgLPeCwKqgPfdCwKqgPvdCwKrgJfeCwKrgJveCwLorfaRDYgDE7H7OqTZ+F1QyXvpu/ls02bN', //If json response will status code 302 , than update this value
                    ctl00$centerHolder$tbFName:req.body.citizenName, //Citizen name (required)
                    ctl00$centerHolder$tbLName:req.body.citizenLastName, //Citizen last name (required)
                    ctl00$centerHolder$tbMName:req.body.citizenSurname,  //Citizen surname
                    ctl00$centerHolder$dtBirthdate: checkBirthDate(),//Citizen  birth date function call via value and post to central election server
                    ctl00$centerHolder$tbRegion:'', //Citizen region
                    ctl00$centerHolder$tbCommunity:'', //Citizen village or community
                    ctl00$centerHolder$tbSt:'',  //Citizen street
                    ctl00$centerHolder$tbBild:'', //Citizen building
                    ctl00$centerHolder$tbApp:'', //Citizen apartment
                    ctl00$centerHolder$ddDistricts:Array.from({length: 40}, (v, k) => k+1), //Do not touch to this value ( es6 feature of array range )
                    ctl00$centerHolder$search:'Փնտրել' //Requirment that form post will be successful  , because data provide from ASP.net server
                }


            },
            function(err,httpResponse,body){
                //Condition if response will be error
               if(err){

                   res.json('Internal error , contact with administrator') //Send json to client

               }else if(httpResponse.statusCode == 302){

                   res.json('Please update your _VIEVSTATE and __EVENTVALIDATION query') //Server requirments values update required

               }else if(httpResponse.statusCode == 503){

                   res.json('Request to server has been failed') //Send notification to client if central election commission server has problem

               }else if(httpResponse.statusCode == 200){
                   let $ = cheerio.load(body); //Load response body into cheerio module for using with JQUERY library core
                   cheerioTableparser($); //Cheerio table parser plugin
                   let result = []; //Statement for empty array to push into It data variable  results
                   let data = $("table tr").each(function (i,val) {

                       result.push({

                           name: $(val).children().eq(0).text(),
                           birth: $(val).children().eq(1).text(),
                           registrationDistrict: $(val).children().eq(2).text(),
                           registrationAdress: $(val).children().eq(3).text(),
                           electionNUmber: $(val).children().eq(4).text(),

                       })

                   }); //Cheerio table parser plugin
                   let serverResponse = cleanDeep(result); //Special npm to remove empty values , which server will be response
                   res.json(serverResponse) //Send json result with names , which was retrieved from  central election commission

               }




            }
        )


});


//Store result information into custom database
app.post('/api/store',function (req,res) {


    //Mongoose establish connection with promise to remote db and export
    mongoose.connect(

        atlasConnection //Connection string

    )
     //Connection promise
    .then(

        function connected(onFulfilled) {

            //Condition if database connection was sucessfull
            if( mongoose.connection.readyState == 1 ){

                let citizen = mongoose.model('users', userSchema); //Citizen model

                //Keys which values required to add new documents into database
                let citizenAdd=  new citizen({

                    Name:  req.body.setName,
                    Last_name: req.body.setLastName,
                    Surname: req.body.setSurname,
                    Birth_date: req.body.setBirthDate,
                    Region: null,
                    Community: req.body.setCommunity,
                    Street: req.body.setAdress,
                    Building: null,
                    Apartment: null

                });

                //Final step to save object into  database document
                citizenAdd.save().then(

                    res.json('You data was added') //Notification as json response for operation success

                )



            }else{

                res.json('There was an error during data storing , please contact with administrator') //Notification as json response  for operation fail

            }


        }

    );









});




app.listen(port,function (err) {

    if(err){

        console.log(err) //Console log listening error

    }else{

        console.log('You have succesfully connected to endpoint server')

    }

});



