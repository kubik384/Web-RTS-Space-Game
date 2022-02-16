"use strict"

import { Utils } from '../misc_modules/utils.js';
import { Base_Page } from './base_page.js';
let utils = new Utils();

class Game extends Base_Page {
    constructor(socket) {
        super();
        this.socket = socket;
        this.displayed_conversations = [];
        this.sent_messages = [];
        this.created_conversation;
        this.received_conversations = false;
    }

    async request_datapack() {
        this.socket.emit('message_datapack_request');
    }

    async display_conversations() {
        if (this.received_conversations) {
            super.setup_page(this.message_datapack);
            console.log(this.message_datapack);
            let new_msg_btn = document.getElementById('new_message_btn');
            new_msg_btn.addEventListener('click', e => {
                e.preventDefault();
                this.open_new_message_form();
            });
            let conversations = this.message_datapack.conversations;
            let conversation_table = document.getElementById('conversation_table');
            for (let i = 0; i < conversations.length; i++) {
                let row = conversation_table.insertRow();
                let subject_cell = row.insertCell();
                let subject_p = document.createElement('p');
                subject_p.append(conversations[i].subject);
                subject_p.dataset.conversation_id = conversations[i].conversation_id;
                subject_p.addEventListener('click', function(e) {
                    this.load_conversation(e.currentTarget.dataset.conversation_id);
                }.bind(this));
                subject_cell.append(subject_p);
                /*
                if (!conversations[i].gotDisplayed) {
                    this.displayed_conversations.push(conversations[i].conversation_id);
                }
                if (!conversations[i].gotOpened) {
                    subject_p.classList.add('new_conversation');
                }
                */
                let sender_cell = row.insertCell();
                sender_cell.append(conversations[i].sender_username);
                let receiver_cell = row.insertCell();
                receiver_cell.append(conversations[i].receiver_username);
                let date_cell = row.insertCell();
                let date = await utils.miliseconds_to_date(conversations[i].last_message_date * 1e3);
                date_cell.append(date);
            }
            /*
            //send list of the displayed conversations to the server
            if (this.displayed_conversations.length > 0) {
                new Promise((resolve, reject) => {setTimeout(resolve, 500);});
                this.socket.emit('conversations_displayed', JSON.stringify(this.displayed_conversations));
            }
            */
        } else {
            setTimeout(this.display_conversations.bind(this), 200);
        }
    }

    async save_conversations(message_datapack) {
        this.received_conversations = true;
        this.message_datapack = JSON.parse(message_datapack);
    }

    async load_conversation(conversation_id) {
        let response = await fetch('/game/message?id=' + conversation_id);
        if (!response.ok) {
            throw new Error('There was an issue with fetching a fight record from the server', { cause: response.status });
        }
        let conversation_text = await response.text();
        await this.display_conversation(conversation_id);
        let messages = conversation_text.split('<');
        for (let i = 1; i < messages.length; i++) {
            let split_text = messages[i].split('>');
            let conversation_details = split_text[0].split('_');
            let timestamp = conversation_details[0];
            let username = conversation_details[1];
            let message_text = split_text[1];
            await this.add_message(message_text, timestamp, username);
        }
    }

    async create_conversation(subject, text) {
        this.socket.emit('create_conversation', subject, text);
    }

    async server_message_confirmation(username, timestamp, confirmation_timestamp) {
        let m_index = this.sent_messages.findIndex(sent_message => sent_message.confirmation_timestamp == confirmation_timestamp);
        if (m_index != -1) {
            let message_text = this.sent_messages[m_index].text;
            await this.add_message(message_text, timestamp, username);
        }
    }

    async add_message(message_text, timestamp, username) {
        let message_table = document.getElementById('message_table');
        if (message_table.style.display != 'none') {
            let message_row = message_table.insertRow(0);
            let message_cell = message_row.insertCell(0);
            let message_p = document.createElement('p');
            message_p.append(message_text);
            message_cell.setAttribute('colspan', 2);
            message_cell.append(message_p);
            let conversation_details_row = message_table.insertRow(0);
            let date_cell = conversation_details_row.insertCell(0);
            date_cell.append(await utils.miliseconds_to_date(timestamp * 1e3));
            let sender_cell = conversation_details_row.insertCell(0);
            sender_cell.append(username);
        }
    }

    async open_new_message_form() {
        document.getElementById('conversation_table_container').style.display = 'none';
        document.getElementById('new_message_container').style.display = '';
        let new_message_form = document.getElementById('new_message_form');
        new_message_form.addEventListener('submit', async e => {
            e.preventDefault();
            let input_els = new_message_form.getElementsByTagName('input');
            let subject_el = input_els[0];
            let subject = subject_el.value;
            subject_el.value = '';
            let username_el = input_els[1];
            let username = username_el.value;
            username_el.value = '';
            let message_el = new_message_form.getElementsByTagName('textarea')[0];
            let message = message_el.value;
            message_el.value = '';
            let confirmation_timestamp = await utils.get_timestamp();
            this.socket.emit('create_conversation', username, subject, message, confirmation_timestamp);
            this.created_conversation = {message_text: message, confirmation_timestamp: confirmation_timestamp};
        });
    }

    async display_created_conversation(username, conversation_id, timestamp, confirmation_timestamp) {
        if (this.created_conversation !== undefined && confirmation_timestamp == this.created_conversation.confirmation_timestamp) {
            await this.display_conversation(conversation_id, true);
            return this.add_message(this.created_conversation.message_text, timestamp, username);
        }
    }

    async display_conversation(conversation_id, new_conversation = false) {
        let message_table_container = document.getElementById('message_table_container');
        document.getElementById(new_conversation ? 'new_message_container' : 'conversation_table_container').style.display = 'none';
        message_table_container.style.display = '';
        let response_container = document.getElementById('response_container');
        let response_button = response_container.getElementsByTagName('button')[0];
        response_button.dataset.conversation_id = conversation_id;
        response_button.addEventListener('click', async e => {
            e.preventDefault();
            let textarea = document.getElementsByTagName('textarea')[0];
            if (textarea.value != '') {
                let message_text = textarea.value;
                let timestamp = await utils.get_timestamp();
                this.sent_messages.push({confirmation_timestamp: timestamp, text: message_text});
                this.socket.emit('write_message', e.currentTarget.dataset.conversation_id, message_text, timestamp);
                textarea.value = '';
            }
        });
    }
}

export { Game };