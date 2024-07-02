const express = require('express');
const bodyParser = require('body-parser');
const { App } = require('@slack/bolt');
const { WebClient } = require('@slack/web-api');
require('dotenv').config();

const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

slackApp.command('/say', async ({ command, ack, say }) => {
  ack();
  await say('Hello bot!');
});

const web = new WebClient(process.env.SLACK_BOT_TOKEN);
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.post('/slack/events', async (req, res) => {
  const payload = JSON.parse(req.body.payload);
  console.log('Received /slack request:', payload);


  const { type, token, trigger_id } = payload;

  if (token !== process.env.SLACK_VERIFICATION_TOKEN) {
    console.error('Verification token mismatch');
    return res.status(400).send('Bad Request: Verification token mismatch');
  }

  if (type === 'shortcut') {
    try {
      await web.views.open({
        trigger_id: trigger_id,
        view: {
          type: 'modal',
          callback_id: 'send_message_view',
          title: {
            type: 'plain_text',
            text: 'Send Message to User'
          },
          blocks: [
            {
              type: 'input',
              block_id: 'user_block',
              element: {
                type: 'users_select',
                action_id: 'user'
              },
              label: {
                type: 'plain_text',
                text: 'Select User'
              }
            },
            {
              type: 'input',
              block_id: 'message_block',
              element: {
                type: 'plain_text_input',
                action_id: 'message'
              },
              label: {
                type: 'plain_text',
                text: 'Message'
              }
            }
          ],
          submit: {
            type: 'plain_text',
            text: 'Send'
          }
        }
      });
      return res.status(200).send('');
    } catch (error) {
      console.error('Error opening view:', error);
      return res.status(500).send('Internal Server Error');
    }
  } else if (type === 'view_submission' && payload.view.callback_id === 'send_message_view') {
    const user = payload.view.state.values.user_block.user.selected_user;
    const message = payload.view.state.values.message_block.message.value;

    try {
      await web.chat.postMessage({
        channel: user,
        text: message
      });
      return res.status(200).send('');
    } catch (error) {
      console.error('Error sending message:', error);
      return res.status(500).send('Internal Server Error');
    }
  }else {
    console.error('Invalid request type:', type);
    return res.status(400).send('Bad Request: Invalid request type');
  }
});

app.post('/slack/interactivity', async (req, res) => {
  const payload = JSON.parse(req.body.payload);
  console.log('Received /slack/interactivity request:', payload);

  if (payload.type === 'view_submission' && payload.view.callback_id === 'send_message_view') {
    const user = payload.view.state.values.user_block.user.selected_user;
    const message = payload.view.state.values.message_block.message.value;

    try {
      await web.chat.postMessage({
        channel: user,
        text: message
      });
      return res.status(200).send('');
    } catch (error) {
      console.error('Error sending message:', error);
      return res.status(500).send('Internal Server Error');
    }
  } else {
    console.error('Invalid payload:', payload);
    return res.status(400).send('Bad Request: Invalid payload');
  }
});

app.post('/hello', async (req, res) => {
  return res.send("testing....");
});

const PORT = process.env.PORT || 3006;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
