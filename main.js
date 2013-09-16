
var express = require('express');
var app = express();
var crawler = require("./lib/crawler.js");


// use the jade engine
app.engine('jade', require('jade').__express);

// use compression where appropriate
app.use(express.compress());

// server out our static directory as static files
app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
    res.render('index.jade', {"title":"Home"});
});

app.get('/go', function(req, res) {
  
//  console.log(req.query.url);
  if(typeof req.query.url != "undefined") {
    crawler.spider(req.query.url, function(d) {
  //    console.log(d);
      res.render('results.jade', {"title":"Results","results": d});
    });
  } else {
    res.render('error.jade', {"title": "Error"});
  }
    
});

var port = process.env.PORT || 3000;

app.listen(port);

