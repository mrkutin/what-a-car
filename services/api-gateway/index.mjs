const SRAVNI_HOST = process.env.SRAVNI_HOST || 'http://0.0.0.0:8110'
const AUTOINS_HOST = process.env.AUTOINS_HOST || 'http://0.0.0.0:8100'
const GIBDD_HOST = process.env.GIBDD_HOST || 'http://0.0.0.0:8090'
const REDIS_HOST = process.env.REDIS_HOST || 'redis://0.0.0.0:6379'

import Fastify from 'fastify'

const fastify = new Fastify({logger: true})
import axios from 'axios'

import {createClient} from 'redis'

const redisClient = createClient({
    url: REDIS_HOST
})
try{
    await redisClient.connect()
} catch (e) {
    console.log(e.message)
}
redisClient.on('error', (err) => console.log('Redis Client Error', err))

const letterMap = {
    'A': 'А',
    'B': 'В',
    'E': 'Е',
    'K': 'К',
    'M': 'М',
    'H': 'Н',
    'O': 'О',
    'P': 'Р',
    'C': 'С',
    'T': 'Т',
    'Y': 'У',
    'X': 'Х'
}


// const authenticate = async (req, res, done) => {
//     if(req.headers.authorization !== `Bearer ${process.env.API_TOKEN}`){
//         res
//             .code(401)
//             .send('Unauthorized')
//     }
//     done()
// }

const retryGetRequest = async (url, maxRetries, retries = 0) => {
    let result = null

    if (retries < maxRetries) {
        result = await axios.get(url)
            .catch(e => {
                retries++
                retryGetRequest(url, maxRetries, retries)
                console.log(e.message)
            })
    }
    return result
}

fastify.route({
    method: 'GET',
    url: '/api/plates/:plate',
    //preHandler: authenticate,
    handler: async (req) => {
        const plate = req.params.plate.split('').map(letter => letterMap[letter.toUpperCase()] || letter.toUpperCase()).join('')

        const sravniPromise = (redisClient.isReady ? redisClient.json.get(`sravni:${plate}`) : Promise.resolve(null))
            .then(async json => {
                if (json) {
                    return json
                }
                try {
                    const res = await retryGetRequest(`${SRAVNI_HOST}/plates/${plate}`, 2)
                    const json = res.data
                    if(json){
                        await redisClient.json.set(`sravni:${plate}`, '$', json)
                    }
                    //todo expire
                    return json
                } catch (e) {
                    return null
                }
            })

        const autoinsPromise = (redisClient.isReady ? redisClient.json.get(`autoins:${plate}`) : Promise.resolve(null))
            .then(async json => {
                if (json) {
                    return json
                }
                try {
                    const res = await retryGetRequest(`${AUTOINS_HOST}/plates/${plate}`, 2)
                    const json = res.data
                    if(json){
                        await redisClient.json.set(`autoins:${plate}`, '$', json)
                    }
                    //todo expire
                    return json
                } catch (e) {
                    return null
                }
            })

        const [autoins, sravni] = await Promise.all([autoinsPromise, sravniPromise])

        const vin = autoins?.vin || sravni?.vin
        const gibddPromise = (redisClient.isReady ? redisClient.json.get(`gibdd:${plate}`) : Promise.resolve(null))
            .then(async json => {
                if (json) {
                    return json
                }
                try {
                    const res = await retryGetRequest(`${GIBDD_HOST}/vins/${vin}`, 2)
                    const json = res.data
                    if(json){
                        await redisClient.json.set(`gibdd:${plate}`, '$', json)
                    }
                    //todo expire
                    return json
                } catch (e) {
                    return null
                }
            })

        const gibdd = await gibddPromise

        return {autoins: autoins || {}, sravni: sravni || {}, gibdd: gibdd || {}}
    }
})

const startHTTPServer = async () => {
    try {
        await fastify.listen({
            host: '0.0.0.0',
            port: process.env.API_PORT || 3000
        })
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}

startHTTPServer()