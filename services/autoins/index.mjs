// блочат по IP если было больше 2 новых сессий, поэтому делаем все в одной сессии
const REDIS_HOST = process.env.REDIS_HOST || 'redis://0.0.0.0:6379'
//const COOKIES_FILE = './cookies.json'

import Redis from 'ioredis'
//import fs from 'fs'

const redisPub = new Redis(REDIS_HOST)
const redisSub = new Redis(REDIS_HOST)
try {
    await redisSub.xgroup('CREATE', 'stream:plate:requested', 'autoins', '$', 'MKSTREAM')
} catch (e) {
    console.log('Group "autoins" already exists in stream:plate:requested, skipping')
}


import {getInsuranceByPlate} from './getInsuranceByPlate.mjs'

const makeId = length => {
    let result = ''
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    const charactersLength = characters.length
    let counter = 0
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength))
        counter += 1
    }
    return result
}

const flatArrayToObject = arr => {
    const obj = {}
    for (let i = 0; i < arr.length; i += 2) {
        obj[arr[i]] = arr[i + 1] || null
    }
    return obj
}

async function listenForMessages(/*lastId = '$'*/) {
    const results = await redisSub.xreadgroup('GROUP', 'autoins', makeId(7), 'BLOCK', '0', 'COUNT', '1', 'STREAMS', 'stream:plate:requested', '>')

    const flatMessages = results.reduce((acc, result) => {
        return acc.concat(result[1])//messages
    }, [])

    for(const message of flatMessages){
        const messageObj = flatArrayToObject(message[1])
        if (messageObj.plate) {
            const key = `autoins:${messageObj.plate}`
            let value = JSON.parse(await redisPub.call('JSON.GET', key))
            if (!value) {
                value = await getInsuranceByPlate(messageObj.plate)
                await redisPub.call('JSON.SET', key, '$', JSON.stringify(value))
                //todo expire
            }
            await redisPub.xadd('stream:autoins:resolved', '*', 'key', key, 'chat_id', messageObj.chat_id, 'plate', messageObj.plate)
        }
    }
    await listenForMessages(/*messages[messages.length - 1][0]*/)
}

listenForMessages()