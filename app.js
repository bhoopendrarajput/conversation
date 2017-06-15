/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var express = require('express'); // app server
var bodyParser = require('body-parser'); // parser for post requests
var Conversation = require('watson-developer-cloud/conversation/v1'); // watson sdk
var request = require('request');
var format = require('util').format;
var moment = require('moment');
var feedsHandler = require('./handlers/feedsHandler')();
var searchHandler = require('./handlers/searchHandler')();

var app = express();

// Bootstrap application settings
app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());

// Create the service wrapper
var conversation = new Conversation({
  // If unspecified here, the CONVERSATION_USERNAME and CONVERSATION_PASSWORD env properties will be checked
  // After that, the SDK will fall back to the bluemix-provided VCAP_SERVICES environment property
  // username: '<username>',
  // password: '<password>',
  url: 'https://gateway.watsonplatform.net/conversation/api',
  version_date: '2016-10-21',
  version: 'v1'
});

// Endpoint to be call from the client side
app.post('/api/message', function(req, res, next) {
  var workspace = process.env.WORKSPACE_ID || '<workspace-id>';
  if (!workspace || workspace === '<workspace-id>') {
    return res.json({
      'output': {
        'text': 'The app has not been configured with a <b>WORKSPACE_ID</b> environment variable. Please refer to the ' + '<a href="https://github.com/watson-developer-cloud/conversation-simple">README</a> documentation on how to set this variable. <br>' + 'Once a workspace has been defined the intents may be imported from ' + '<a href="https://github.com/watson-developer-cloud/conversation-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.'
      }
    });
  }

  var payload = {
    workspace_id: workspace,
    context: req.body.context || {},
    input: req.body.input || {}
  };

  payload.context.next_action = "";

  // Send the input to the conversation service
  conversation.message(payload, function(err, data) {
    if (err) {
      return res.status(err.code || 500).json(err);
    }
    updateMessage(data, function(err, resp){
        return res.json(resp);
    });
  });
});

/**
 * Updates the response text using the intent confidence
 * @param  {Object} input The request to the Conversation service
 * @param  {Object} response The response from the Conversation service
 * @return {Object}          The response with the updated message
 */
function updateMessage(response, cb) {
  console.log(response);
  var responseText = null;
  if (!response.output) {
    response.output = {};
  }

  if (response.intents && response.intents[0]) {
    var intent = response.intents[0];
    // Depending on the confidence of the response the app can return different messages.
    // The confidence will vary depending on how well the system is trained. The service will always try to assign
    // a class/intent to the input. If the confidence is low, then it suggests the service is unsure of the
    // user's intent . In these cases it is usually best to return a disambiguation message
    // ('I did not understand your intent, please rephrase your question', etc..)
    if (intent.confidence <= 0.5) {
      responseText = 'I did not understand your intent';
    }
  }

  if(response.context && response.context.next_action){
      var next_action = response.context.next_action;
      console.log("NEXT ACTION: >>> ", next_action);
      if(next_action == 'google_search'){
          searchGoogle(response, function(err, resp){
              return cb(null, resp);
          });
      }

      if(next_action == "news_service"){
				getNewsFeeds(response, function(err, response){
					return cb(err, response);
				});
			}

      if(next_action && next_action == "weather_service"){
				getWeather(response, function(err, response){
					return cb(err, response);
				});
			}

      if(next_action && next_action == "date_time"){
				handleDateNTimeAction(response, function(err, response){
					return cb(err, response);
				});
			}

      if(next_action && next_action == "continue"){
        cb(null, response);
      }

  }else{
    if(!response.output.text){
      response.output.text = [];
    }else{
      response.output.text.push(responseText);
    }
    return cb(null, response);
  }
  // return cb(null, response);
}

function searchGoogle(response, cb) {
	    console.log('Doing Google Search ');
	    var params = {"keyword": response.input.text};
	    searchHandler.searchGoogle(params, function(err, results){
        if (err) {
	            cb(err, null);
	        }else{
	        	if(results && results.length > 0){
	        		response.output = {
		        			text: results
		        	};
	        	}else{
	        		delete response.output["text"];
	        		response.context.next_action == "DO_NOTHING";
	        	}
	            cb(null, response);
	        }
	    });
	};

  function getNewsFeeds(response, cb) {
	    console.log('fetching News Feeds');
	    var params = {"feedURL": "http://feeds.feedburner.com/ndtvnews-latest"};
	    feedsHandler.fetchFeedsData(params, function(err, feedsResp){
	    	if (err) {
	            cb(err, null);
	        }else{
	        	console.log("Feeds Response: >>> ", feedsResp);
	        	if(feedsResp && feedsResp.length > 0){
	        		response.output = {
		        			text: feedsResp
		        	};
	        	}else{
	        		delete response.output["text"];
	        		response.context.next_action == "DO_NOTHING";
	        	}
	            cb(null, response);
	        }
	    });
	};

  function getWeather(response, cb) {
      if(!response.context && !response.context.location){
        cb(new Error("Please provide the location "), null);
        return false;
      }
	    console.log('fetching weather for : >>> ', response.context.location);

	    var url =  "https://query.yahooapis.com/v1/public/yql?q=select item.condition from weather.forecast where woeid in (select woeid from geo.places(1) where text='"+response.context.location+"')&format=json";
	    request({
	        url: url,
	        json: true
	    }, function (err, resp, body) {
	        if (err) {
	            cb(err, null);
	        }
	        if (resp.statusCode != 200) {
	           cb(new Error(format("Unexpected status code %s from %s\n%s", resp.statusCode, url, body)), null);
	        }
	        try {
	        	var weather = body.query.results.channel.item.condition;
	        	var temperature = Number((weather.temp - 32) * 5/9).toFixed(2);
	        	var respText = format('The current weather conditions are %s degrees and %s.', temperature, weather.text);
	        	response.output = {
	        			text: [respText]
	        	};
	        	console.log(respText);
	            cb(null, response);
	        } catch(ex) {
	            ex.message = format("Unexpected response format from %s - %s", url, ex.message);
	            cb(ex, null);
	        }
	    });
	};

  function handleDateNTimeAction(response, cb){
    console.log('Handling DateTime: >> ', response.context);
	    if(response.context.show){
	    		if(response.context.show.length > 1){
	    			var dateTimeResp = "It's "+moment().format("LLLL");
		    		console.log("Output: ", dateTimeResp);
		    		response.output = {
		        			text: [dateTimeResp]
		        	};
	    		}

	    		if(response.context.show.length == 1){
	    			if(response.context.show[0] == "date"){
	    				var dateTimeResp = "It's "+moment().format("LL");
			    		console.log("Output: ", dateTimeResp);
			    		response.output = {
			        			text: [dateTimeResp]
			        	};
	    			}
	    			if(response.context.show[0] == "time"){
	    				var dateTimeResp = "It's "+moment().format("LT");
			    		console.log("Output: ", dateTimeResp);
			    		response.output = {
			        			text: [dateTimeResp]
			        	};
	    			}
	    			if(response.context.show[0] == "day"){
	    				var dateTimeResp = "It's "+moment().format("dddd");
			    		console.log("Output: ", dateTimeResp);
			    		response.output = {
			        			text: [dateTimeResp]
			        	};
	    			}
	    		}


	    }

	    cb(null, response);
  }

module.exports = app;
