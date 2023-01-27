import Fastify from 'fastify'
const fastify = new Fastify({logger: true})

import {getHistoryByVin} from './getHistoryByVin.mjs'
import {getAccidentsByVin} from './getAccidentsByVin.mjs'
import {getWantedByVin} from './getWantedByVin.mjs'
import {getRestrictionsByVin} from './getRestrictionsByVin.mjs'
import {getDiagnosticCardsByVin} from './getDiagnosticCardsByVin.mjs'


fastify.route({
    method: 'GET',
    url: '/',
    handler: async () => {
        return 'GIBDD'
    }
})

fastify.route({
    method: 'GET',
    url: '/vins/:vin',
    handler: async (req) => {
        const vin = req.params.vin

        const history = await getHistoryByVin(vin)
        const accidents = await getAccidentsByVin(vin)
        const wanted = await getWantedByVin(vin)
        const restrictions = await getRestrictionsByVin(vin)
        const diagnosticCards = await getDiagnosticCardsByVin(vin)

        return {...history, accidents, wanted, restrictions, diagnosticCards}
    }
})

const startHTTPServer = async () => {
    try {
        await fastify.listen({
            host: '0.0.0.0',
            port: 8090
        })
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}

startHTTPServer()