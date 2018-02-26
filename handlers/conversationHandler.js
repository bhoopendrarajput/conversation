'use strict'

var request = require('request'),
		format = require('format');
const assert = require('assert');
const feedsHandler = require('./feedsHandler')();
const searchHandler = require('./searchHandler')();
const discoveryHandler = require('./discoveryHandler')();

const watson = require('watson-developer-cloud');
const conversation = new watson.conversation({ version: 'v1', version_date: '2017-05-26' });

module.exports = function() {

var methods = {};

	methods.callConversation = function(params) {
		console.log("IN conversationHandler.callConversation: >>> ", params);
    return new Promise(function(resolve, reject){
      assert(params, 'params cannot be null');
      assert(params.input, 'params.input cannot be null');
      assert(params.context, 'params.context cannot be null');

			params.context.next_action = null;

      const workspaceId = process.env.WORKSPACE_ID || '<workspace-id>';
      if (!workspaceId || workspaceId === '<workspace-id>') {
        return reject(new Error('The app has not been configured with a <b>WORKSPACE_ID</b> environment variable. Please refer to the ' + '<a href="https://github.com/sinny777/conversation">README</a> documentation on how to set this variable. <br>' + 'Once a workspace has been defined the intents may be imported from ' + '<a href="https://github.com/sinny777/conversation/blob/master/training/conversation/car_workspace.json">here</a> in order to get a working application.'));
      }

      var payload = {
        workspace_id: workspaceId,
        context: params.context || {},
        input: params.input || {}
      };
			// console.log("Calling Watson Conversation with payload: >> ", payload);
      conversation.message(payload, function(err, conversationResp) {
        if (err) {
          return reject(err);
        }
        if(conversationResp.output.hasOwnProperty('action') && conversationResp.output.action.hasOwnProperty('call_discovery')) {

          discoveryHandler.callDiscovery(conversationResp).then((discoveryResp) => {
              return resolve(discoveryResp);
            }).catch(function(error) {
              return reject(error);
            });
        }else{
          // updateMessage(conversationResp, function(err, resp){
          //     return resolve(response);
          // });
					// console.log("Conversation Response: >>> ", conversationResp);
          let returnJson = conversationResp;
          delete returnJson.environment_id;
          delete returnJson.collection_id;
          delete returnJson.username;
          delete returnJson.password;

					updateMessage(conversationResp, function(error, updatedResp){
							return resolve(updatedResp);
					});

        }
      });
    });

	};

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
          return cb(null, response);
        }else{
          // return cb(null, response);
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

    return methods;

}
