const SRAVNI_HOST = process.env.SRAVNI_HOST || 'http://0.0.0.0:8110'
const AUTOINS_HOST = process.env.AUTOINS_HOST || 'http://0.0.0.0:8100'
const GIBDD_HOST = process.env.GIBDD_HOST || 'http://0.0.0.0:8090'
const REDIS_HOST = process.env.REDIS_HOST || 'redis://0.0.0.0:6379'

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

const collectByPlate = async plate => {
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

export {collectByPlate}