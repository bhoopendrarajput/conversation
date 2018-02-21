# IBM Watson Conversation with Discovery Service


This application shows the capabilities of Watson [Conversation](https://console.bluemix.net/docs/services/conversation/index.html#about) and [Discovery](https://console.bluemix.net/docs/services/discovery/index.html) services to work together to find answers on a given query. In this sample app, the user is chatting with a virtual car dashboard, giving it commands in plain English such as "Turn on the wipers," "Play me some music," or "Let's find some food." If the user makes a request and Conversation is not confident in its answer (e.g. "How do I check my tire pressure?"), Discovery will search the car manual and return the most relevant results, if relevant materials exist.

## Table of Contents
* [How it Works](#how-it-works)
* [Run Locally](#run-locally)
  * [Getting Started](#getting-started)
  * [Setting up Watson Services](#setting-up-watson-services)
  * [Train Watson Services](#train-watson-services)
  * [Running the App](#running-the-app)
* [License](#license)

## How it Works

![Flow diagram](README_pictures/Flow_diagram.png?raw=true)

Under the hood, there are two components to this app:
* One is the front-end, which is simply static assets (HTML, CSS etc.)
* The other is the nodejs based server side logic:
  * When the user inputs text, the UI sends the current context and input to the server. These are processed by the Conversation service and returned, with an output and new context. The results are sent to the next action.
  * The Discovery action checks for a flag from the Conversation output, and if it is present takes the original input and queries the manual with it. If there is no flag, the Conversation results pass through the function unchanged. The Server returns the output and updated context back to the UI.


## Run Locally

### Getting Started
1. If you don't already have an IBM Cloud account, you can sign up [here](https://console.bluemix.net/?cm_mmc=GitHubReadMe)
> Make sure you have at least 2 services available in your IBM Cloud account.

2. Clone (or fork) this repository, and go to the new directory
```bash
git clone https://github.com/sinny777/conversation.git
cd conversation
```

3. Install [Node.js](https://nodejs.org) (Versions >= 6).

4. In the root directory of your repository, install the project dependencies.
```bash
npm install
```

### Setting up Watson Services

1. [Create  a project](https://console.bluemix.net/developer/watson/create-project?services=conversation%2Cdiscovery) using the Watson Console using Conversation and Discovery services.

2. In the Watson Console navigate to [Projects](https://console.bluemix.net/developer/watson/projects), click your newly created project, copy credentials from Project View page and paste them in to a new `credentials.json` file.

### Train Watson Services
Run following commands to train Conversation and Discovery services:
``` bash
  npm run train
```

### Running the App
1. Install the demo app package into the local Node.js runtime environment:

    ```bash
    npm install
    ```

1. Start the app:

    ```bash
    npm start
    ```

1. Point your browser to http://localhost:3000 to try out the app.

## Testing the app

After your app is installed and running, experiment with it to see how it responds.

The chat interface is on the left, and the JSON that the JavaScript code receives from the Conversation service is on the right. Your questions and commands are interpreted using a small set of sample data trained with the following intents:

    turn_on
    turn_off
    turn_up
    turn_down
    traffic_update
    locate_amenity
    weather
    phone
    capabilities
    greetings
    goodbyes

Type a request, such as `music on` or `I want to turn on the windshield wipers`. The system understands your intent and responds. You can see the details of how your input was understood by examining the JSON data in the `Watson understands` section on the right side.

For example, if you type `Turn on some music`, the JSON data shows that the system understood the `turn_on` intent with a high level of confidence, along with the `appliance` entity with a value of `music`.

In addition to conversational commands, you can also ask questions that you would expect to have answered in your car manual. For example:

    How do I check my tire pressure
    How do I turn on cruise control
    How do I improve fuel efficiency
    How do I connect my phone to bluetooth

## License

This sample code is licensed under Apache 2.0.
Full license text is available in [LICENSE](LICENSE).

## Reference

[cf_docs]: (https://www.ibm.com/watson/developercloud/doc/common/getting-started-cf.html)
[cloud_foundry]: https://github.com/cloudfoundry/cli#downloads
[doc_intents]: (http://www.ibm.com/watson/developercloud/doc/conversation/intent_ovw.shtml)
[docs]: http://www.ibm.com/watson/developercloud/doc/conversation/overview.shtml
[docs_landing]: (http://www.ibm.com/watson/developercloud/doc/conversation/index.shtml)
[node_link]: (http://nodejs.org/)
[npm_link]: (https://www.npmjs.com/)
[sign_up]: bluemix.net/registration
