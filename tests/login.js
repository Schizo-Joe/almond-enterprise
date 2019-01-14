// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Almond Cloud
//
// Copyright 2018 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

require('thingengine-core/lib/polyfill');
require('./polyfill');
process.on('unhandledRejection', (up) => { throw up; });

// Login to Web Almond with username and password
// returns a Cookie header that can be used in subsequent requests

const assert = require('assert');
const Tp = require('thingpedia');
const tough = require('tough-cookie');
const minidom = require('./util/minidom');

function accumulateStream(stream) {
    return new Promise((resolve, reject) => {
        const buffers = [];
        let length = 0;
        stream.on('data', (buf) => {
            buffers.push(buf);
            length += buf.length;
        });
        stream.on('end', () => resolve(Buffer.concat(buffers, length)));
        stream.on('error', reject);
    });
}

function getCsrfToken(htmlString) {
    for (let input of minidom.getElementsByTagName(minidom.parse(htmlString), 'input')) {
        if (minidom.getAttribute(input, 'name') === '_csrf')
            return minidom.getAttribute(input, 'value');
    }

    throw new Error('Failed to find input[name=_csrf]');
}

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:8080';

async function main() {
    const loginStream = await Tp.Helpers.Http.getStream(baseUrl + '/user/login');
    const cookieHeader = loginStream.headers['set-cookie'][0];
    assert(cookieHeader);
    const cookie = tough.Cookie.parse(cookieHeader);

    const loginResponse = (await accumulateStream(loginStream)).toString();
    const csrfToken = getCsrfToken(loginResponse);

    const username = process.argv[2];
    const password = process.argv[3];

    await Tp.Helpers.Http.post(baseUrl + '/user/login',
        `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&_csrf=${encodeURIComponent(csrfToken)}`, {
        dataContentType: 'application/x-www-form-urlencoded',
        extraHeaders: {
            'Cookie': cookie.cookieString()
        }
    });

    console.log(cookie.cookieString());
}
main();
