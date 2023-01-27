import Fastify from 'fastify'
const fastify = new Fastify({logger: true})

import {getEstimateByPlate} from './getEstimateByPlate.mjs'

fastify.route({
    method: 'GET',
    url: '/',
    handler: async () => {
        return 'SRAVNI'
    }
})

fastify.route({
    method: 'GET',
    url: '/plates/:plate',
    handler: async (req) => {
        const plate = req.params.plate
        return getEstimateByPlate(plate)
    }
})

const startHTTPServer = async () => {
    try {
        await fastify.listen({
            host: '0.0.0.0',
            port: process.env.AUTOINS_PORT || 8110
        })
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}

startHTTPServer()