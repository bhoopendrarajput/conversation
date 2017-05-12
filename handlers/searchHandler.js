'use strict'

var google = require('google')

google.resultsPerPage = 20;
var results_count = 3;

module.exports = function() {

var methods = {};

	methods.searchGoogle = function(params, cb) {
		console.log("IN searchHandler.searchGoogle: >>> ", params);
		var results = ["Here are some search results. \n"];
		google(params.keyword, function (err, res){
			  if (err) cb(err, null);
			  for (var i = 0; i < res.links.length; ++i) {
			    var link = res.links[i];
			    if(i <= results_count){
			    	 results.push(link.description + " ")
			    }else{
			    	break;
			    }
			  }
			  cb(null, results);
			});
	};

    return methods;

}
