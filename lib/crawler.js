var async = require('async');
var request = require('request');
var cheerio = require('cheerio');
var libphonenumber = require('libphonenumber');
var phoneUtil = libphonenumber.phoneUtil;

String.prototype.trim = function() {
    return this.replace(/^\s+|\s+$/g, "");
};

var countInternal = function(anchors, url) {
  var retval = 0;
  for(var key in anchors) {
    var a = anchors[key];
    if(typeof a.attribs != 'undefined' && typeof a.attribs.href != "undefined" && 
       (a.attribs.href.indexOf(url) > -1 || a.attribs.href.indexOf("http:") == -1)) {
      retval++;
    }
  }
  return retval;
}

var match_twitter = function(anchors) {

  var ret = [];
  for(i in anchors) {
    if(typeof anchors[i] != "undefined") {
      var match = anchors[i].match(/twitter.com\/.+/g);

      // matched a twitters
      if(match) {
        // Dont use teh share links or teh status links
        if(anchors[i].match(/\/search\/?|\/status\/?|\/share\/?|\/intent\/?|\/home\??/g)){
          continue;
        }

        // remove the slash at the end
        if (match[0].substr(match[0].length-1,1) == "/") {
          match[0] = match[0].substr(0,match[0].length-1)
        }

        // add teh link
        ret.push("http://"+match[0].toLowerCase());
      }
    }
  }
  return ret;
};

// function to format telephone numbers
var formatPhone = function(number, country) {
  var numberTypes ={
    0:"fixed_line",
    1:"mobile",
    2:"fixed_line_or_mobile",
    3:"toll_free",
    4:"premium_rate",
    5:"shared_cost",
    6:"voip",
    7:"personal_number",
    8:"pager",
    9:"uan",
    10:"unknown"
  }
  
  var retval={ success: true, original_number: number, country:country, area_code: null};
  
  if(typeof number != "undefined") {
        
    // strip out guff before we start - MB complained
    var number = number.replace(/[^0-9]/g,'');

    // don't bother checking very small numbers
    if(number.length>3 && number.length<18) {
      var parsed = phoneUtil.parse(number, country);


      // extract the national number & area code
      var nationalSignificantNumber = phoneUtil.getNationalSignificantNumber(parsed);
      var areaCode;
      var subscriberNumber;
      var areaCodeLength = phoneUtil.getLengthOfGeographicalAreaCode(parsed);
      if (areaCodeLength > 0) {
         areaCode = nationalSignificantNumber.substring(0, areaCodeLength);
         subscriberNumber = nationalSignificantNumber.substring(areaCodeLength);
      } else {
         areaCode = '';
         subscriberNumber = nationalSignificantNumber;
      }

      // prepare output data
      retval.area_code = areaCode;
      retval.e164_number = phoneUtil.format(parsed, 0);
      retval.international_number = phoneUtil.format(parsed, 1);
      retval.national_number = phoneUtil.format(parsed, 2);
      retval.national_number_2 = retval.national_number.replace(/[)()]/g,"");
      retval.rfc3966_number = phoneUtil.format(parsed, 3);
      retval.is_mobile  = (phoneUtil.getNumberType(parsed) == 1);
      retval.number_type = numberTypes[phoneUtil.getNumberType(parsed)];
      retval.is_valid=phoneUtil.isValidNumber(parsed);
    } else {
      retval.is_valid=false;
    }
  } else {
    retval.is_valid=false;
  }
  
//  console.log(number,retval.is_valid);
  
  return retval;
}

var match_phones = function(str) {
 
 var retval = [];
 
 var minimum = 8;            // typical minimum phone number length
   var items = [];

   var i = 0, n = '', min = minimum;

   while(i < str.length) {
       switch(str[i]) {
       case '+':                                   // start of international number
           if (n.length >= min) items.push(n);
           n = str[i];
        //   min = minimum + 2;                      // at least 2 more chars in number
           break;
       case '-': 
       case '.': 
       case '(': 
       case ')':     // ignore punctuation
           break;
       case ' ':
           if (n.length >= min) {              // space after consuming enough digits is end of number
               items.push(n);
               n = '';
           } 
           break;
       default:
           if (str[i].match(/[0-9]/)) {            // add digit to number
               n += str[i];
           } else {
               if (n.length >= min) {
                   items.push(n);                  // else end of number
               }
               n = '';
           }
           break;
       }
       i++;
   }

  var minimum = 9;            // typical minimum phone number length
  
  var i = 0, n = '', min = minimum;
  
  while(i < str.length) {
    switch(str[i]) {
    case '+':                                   // start of international number
      if (n.length >= min) items.push(n);
      n = str[i];
    //   min = minimum + 2;                      // at least 2 more chars in number
      break;
    case '-': 
    case '.': 
    case '(': 
    case ')':     // ignore punctuation
      break;
    case ' ':
      if (n.length >= min) {              // space after consuming enough digits is end of number
        items.push(n);
        n = '';
      } 
      break;
    default:
      if (str[i].match(/[0-9]/)) {            // add digit to number
        n += str[i];
      } else {
        if (n.length >= min) {
          items.push(n);                  // else end of number
        }
        n = '';
      }
      break;
    }
    i++;
  }
  
  if (n.length >= min) {              // EOF
     items.push(n);
  }

  // for all of the phones process them
  var itemsToRemove = [];
  for(item in items){
    
    try {
      var phone = formatPhone(items[item],"gb");
      if(phone.is_valid) {
        retval.push(items[item]);
      }
    }
    
    catch(e) {

    }
    
  }

  return retval;
}


var match_facebook = function(anchors) {
  var ret = [];
  for(i in anchors) {
    if(typeof anchors[i] != "undefined") {
      var match = anchors[i].match(/facebook.com\/.+/g);
    
      // matched a facebooks
      if(match) {
    
        // dont use teh share pages
        if(anchors[i].match(/\/(sharer|share).php|\/dialog\/?|\/oauth\/?/g)){
          continue;
        }
      
        // add teh link
        ret.push("http://www."+match[0].toLowerCase());
      }
    }
  }
  return ret;
};


var calculateScore = function(doc) {
  doc.score = 100;
  /*
  * it can't be successfully fetched (success = 0) 
  * it can't be identified as html4, xhtml or html5 ( html4=0, xhtml=0, html5=0) 
  * it isn't html5 (html4=1 OR xhtml=1) 
  * it has oldmarkup (oldmarkup=1) 
  * it has neither twitter nor facebook links (twitter=0 AND facebook=0) 
  * it has frames or tables (frames=1 OR tables=1) 
  * it has no cookie_policy (cookie_policy=0) 
  * it has no meta tags (meta_keywords=0 OR meta_description=0) 
  * it has no telephone number (telephone=0)
  */
  if(!doc.success) {
    doc.score = 0;
  }
  if(!doc.html4 && !doc.xhtml && !doc.html5) {
    doc.score -= 5;
  }
  if(doc.html4 || doc.xhtml) {
    doc.score -= 10;
  }
  if(doc.oldmarkup) {
    doc.score -= 20;
  }
  if(!doc.twitter || !doc.facebook) {
    doc.score -= 10;
  }
  if(doc.frames || doc.tables) {
    doc.score -= 20;
  }
  if(!doc.cookie_policy) {
    doc.score -= 10;
  }
  if(!doc.meta_description && !doc.meta_keywords) {
    doc.score -= 10;
  }
  if(!doc.telephone) {
    doc.score -= 10;
  }
  if(doc.score < 0) {
    doc.score = 0;
  }
}

var spider = function (url, callback) {  
  
  var doc = {};
  doc.url = url;
  // add extra data
  doc.redirectsTo = '';
  doc.success = 0;
  doc.title = '';
  doc.size = 0;
  doc.telephone = 0;
  doc.meta_keywords = '';
  doc.meta_description = '';
  doc.html5 = 0;
  doc.xhtml = 0;
  doc.html4 = 0;
  doc.cookie_policy = 0;
  doc.twitter = 0;
  doc.facebook = 0;
  doc.oldmarkup = 0;
  doc.tables = 0;
  doc.frames = 0;
  
  doc.url = doc.url.trim();
  if(doc.url.indexOf("http") != 0) {
    doc.url = "http://" + doc.url;
  }
  request( { uri: doc.url, timeout: 10000, followRedirect:true, maxRedirects:1}, function(e, r, b) {
    if(e) {
      calculateScore(doc);
      callback(doc);
    }  else {
      if(r.request.redirects.length > 0) {
        doc.redirectsTo = r.request.redirects[0].redirectUri;
      }
      
      var $ = cheerio.load(b);
      var a_tags = $('a');
      var linksonly = [];
      for(var key in a_tags) {
        if(typeof a_tags[key] != 'undefined' && typeof a_tags[key].attribs != 'undefined' ) {
          linksonly.push(a_tags[key].attribs.href);
        }
      }
           
      doc.success = 1;
      doc.title = $('title').first().html();
      if(doc.title) {
        doc.title = doc.title.replace(/\r/g," ").replace(/\n/g," ").replace(/\t/g," ");        
      }
      doc.size = countInternal(a_tags, doc.url);
      doc.telephone = 0;
      doc.meta_keywords = ($('meta[name="keywords"]').length > 0)?1:0;
      doc.meta_description = ($('meta[name="description"]').length > 0)?1:0;
      doc.html5 = (b.indexOf("<!DOCTYPE html>") > -1)?1:0;
      doc.xhtml = (b.indexOf("xhtml") > -1)?1:0;
      doc.html4 = (b.indexOf("html4") > -1)?1:0;
      doc.cookie_policy = (b.match(/cookie/i))?1:0;
      doc.twitter = (match_twitter(linksonly).length > 0)?1:0;
      doc.facebook = (match_facebook(linksonly).length > 0)?1:0;
      doc.oldmarkup = (b.indexOf("<HTML") > 0 || b.indexOf("FrontPage") > 0)?1:0;
      doc.tables = ($('table').length > 0)?1:0;
      doc.frames = ($('frame').length > 0 || $('frameset').length > 0)?1:0;
      doc.telephone = (match_phones(b).length > 0)?1:0;
      
      $ = null;
      linksonly = null;
      a_tags = null;
      b = null;
      calculateScore(doc);
//      console.log(doc);
      callback(doc);
    }

  });
  
}

module.exports = {
  spider: spider
}




