// блочат по IP если было больше 2 новых сессий, поэтому делаем все в одной сессии
const REDIS_HOST = process.env.REDIS_HOST || 'redis://0.0.0.0:6379'
const REDIS_EXPIRATION_SEC = parseInt(process.env.REDIS_EXPIRATION_SEC || 86400)

import Redis from 'ioredis'

const redisPub = new Redis(REDIS_HOST)
const redisSub = new Redis(REDIS_HOST)
try {
    await redisSub.xgroup('CREATE', 'stream:plate:requested', 'mosreg', '$', 'MKSTREAM')
} catch (e) {
    console.log('Group "mosreg" already exists in stream:plate:requested, skipping')
}


import {getTaxiRegByPlate} from './getTaxiRegByPlate.mjs'

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
    const results = await redisSub.xreadgroup('GROUP', 'mosreg', makeId(7), 'BLOCK', '0', 'COUNT', '1', 'STREAMS', 'stream:plate:requested', '>')

    const flatMessages = results.reduce((acc, result) => {
        return acc.concat(result[1])//messages
    }, [])

    for(const message of flatMessages){
        const messageObj = flatArrayToObject(message[1])
        const {chat_id, plate} = messageObj
        if (plate) {
            const key = `mosreg:${plate}`
            const chatSettings = JSON.parse(await redisPub.call('JSON.GET', `chat:${chat_id}`))
            let value = JSON.parse(await redisPub.call('JSON.GET', key))
            if (!value || chatSettings?.cache === false) {
                value = await getTaxiRegByPlate(plate)
                console.log(JSON.stringify(value, null, 2))
                await redisPub.call('JSON.SET', key, '$', JSON.stringify(value))
                await redisPub.expire(key, REDIS_EXPIRATION_SEC)
            }
            await redisPub.xadd('stream:mosreg:resolved', '*', 'key', key, 'chat_id', chat_id, 'plate', plate)
        }
    }
    await listenForMessages(/*messages[messages.length - 1][0]*/)
}

listenForMessages()