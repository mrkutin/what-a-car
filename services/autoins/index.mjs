import Fastify from 'fastify'
const fastify = new Fastify({logger: true})

import puppeteer from 'puppeteer-extra'
import {executablePath} from 'puppeteer'

import SessionPlugin from 'puppeteer-extra-plugin-session'
puppeteer.use(SessionPlugin.default())

import StealthPlugin from 'puppeteer-extra-plugin-stealth'
puppeteer.use(StealthPlugin())


const browser = await puppeteer.launch({
    headless: true,
    executablePath: executablePath(),
    defaultViewport: {
        width: 1920, height: 1080
    },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
    //args: [ '--proxy-server=http://80.244.229.102:10000' ]
})

const page = await browser.newPage()
await page.goto('https://dkbm-web.autoins.ru/dkbm-web-1.0/policyInfo.htm')

import {getInsuranceByPlate} from './getInsuranceByPlate.mjs'
import {getInsuranceByVin} from './getInsuranceByVin.mjs'

fastify.route({
    method: 'GET',
    url: '/',
    handler: async () => {
        return 'AUTOINS'
    }
})

fastify.route({
    method: 'GET',
    url: '/plates/:plate',
    handler: async (req) => {
        const plate = req.params.plate
        return getInsuranceByPlate(page, plate)
    }
})

fastify.route({
    method: 'GET',
    url: '/vins/:vin',
    handler: async (req) => {
        const vin = req.params.vin
        return getInsuranceByVin(page, vin)
    }
})

const startHTTPServer = async () => {
    try {
        await fastify.listen({
            host: '0.0.0.0',
            port: process.env.AUTOINS_PORT || 8100
        })
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}

startHTTPServer()