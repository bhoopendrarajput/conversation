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
var request = require('request');
var format = require('util').format;
var moment = require('moment');
var conversationHandler = require('./handlers/conversationHandler')();
var searchHandler = require('./handlers/searchHandler')();

var watson = require('watson-developer-cloud');
const conversation = new watson.conversation({ version: 'v1', version_date: '2017-05-26' });

var app = express();

// Bootstrap application settings
app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());

// Endpoint to be call from the client side
app.post('/api/message', function(req, res, next) {
  var params = req.body;
  if(!params.input){
    params.input = {};
  }

  conversationHandler.callConversation(params).then((responseJson) => {
      responseJson.date = new Date();
      return res.json(responseJson);      
    }).catch(function(error) {
      throw error;
    });

});

module.exports = app;
