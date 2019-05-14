const express = require('express');
const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');

//DB모듈 불러오기
const mysql = require('mysql');

const dbSecret = require('./mymodules/dbsecret');
const lunch = require("./lunch");

const conn = mysql.createConnection(dbSecret);


//익스프레스 만들기
let app = express();

app.set('port', 12000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static( path.join(__dirname, 'public')) );
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

app.get('/', function(req, res){
    res.render('main', {title : "Welcome to Express!"});
});

app.get('/lunch', function(req, res) {
    res.render('lunchview');
});

app.post('/lunch', function(req, res){
    let date = req.body.date;  // 2019-05-14
    date = date.split("-").join("");
    lunch(date, function(menu){
        res.render('lunchresult', {data:menu, date:req.body.date});
    });
});

app.get('/register', function(req, res){
    res.render('registerpage');
});

app.post('/register', function(req, res) {

});

let server = http.createServer(app);
server.listen(app.get('port'), function(){
    console.log("Express 엔진 실행중!");
});

