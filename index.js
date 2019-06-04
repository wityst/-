const express = require('express');
const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');

//라우터 불러오기
const boardRouter = require('./mymodules/board');
const defaultRouter = require('./mymodules/default');

//세션 불러오기
const session = require('express-session');

//익스프레스 만들기
let app = express();

app.set('port', 12000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.static( path.join(__dirname, 'public')) );
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
    resave:false,  //요청 변경시에도 세션정보 저장 일반적으로 false
    saveUninitialized:false, // 초기화되지 않은 세션들도 저장할 것인가?
    secret:"gondr"   //사용자한테 보내지는 쿠키를 암호화할 때 쓸 키
}));

//플래시 메시지 처리 미들웨어 시작
app.use((req, res, next)=> {
    if(req.session.flashMsg != undefined){
        res.locals.flash = req.session.flashMsg;
        delete req.session.flashMsg;
    }

    if(req.session.user != undefined){
        res.locals.user = req.session.user;
    }

    //console.log(req.path);
    next();
});
//플래시 메시지 처리 미들웨어 끝

app.use('/', defaultRouter);
app.use('/board', boardRouter);

app.all("*", (req, res)=>{
    res.render('error', {
        head:"에러 발생", 
        msg:`존재하지 않는 페이지입니다.`});
    return;
});

let server = http.createServer(app);
server.listen(app.get('port'), function(){
    console.log("Express 엔진 실행중!");
});