import Fastify from 'fastify'

const fastify = new Fastify({logger: true})
import {collectByPlate} from './collectInfo.mjs'

const en2ruMap = {
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
const ru2enMap = {
    'А': 'A',
    'В': 'B',
    'Е': 'E',
    'К': 'K',
    'М': 'M',
    'Н': 'H',
    'О': 'O',
    'Р': 'P',
    'С': 'C',
    'Т': 'T',
    'У': 'Y',
    'Х': 'X'
}

// const authenticate = async (req, res, done) => {
//     if(req.headers.authorization !== `Bearer ${process.env.API_TOKEN}`){
//         res
//             .code(401)
//             .send('Unauthorized')
//     }
//     done()
// }


fastify.route({
    method: 'GET',
    url: '/api/:id',
    //preHandler: authenticate,
    handler: async (req, res) => {
        const id = req.params.id.toUpperCase()
        const plate = id.split('').map(letter => en2ruMap[letter] || letter).join('')
        const vin = id.split('').map(letter => ru2enMap[letter] || letter).join('')

        let data = null

        if (
            plate.match(/^[АВЕКМНОРСТУХ]\d{3}(?<!000)[АВЕКМНОРСТУХ]{2}\d{2,3}$/ui) //обычный номер
            // || plate.match(/^[АВЕКМНОРСТУХ]{2}\d{3}(?<!000)\d{2,3}$/ui) //такси
            // || plate.match(/^[АВЕКМНОРСТУХ]{2}\d{4}(?<!0000)\d{2,3}$/ui) //прицеп
            // || plate.match(/^\d{4}(?<!0000)[АВЕКМНОРСТУХ]{2}\d{2,3}$/ui) //мотоцикл
            // || plate.match(/^[АВЕКМНОРСТУХ]{2}\d{3}(?<!000)[АВЕКМНОРСТУХ]\d{2,3}$/ui) //транзит
            // || plate.match(/^Т[АВЕКМНОРСТУХ]{2}\d{3}(?<!000)\d{2,3}$/ui) //выездной
        ) {
            data = await collectByPlate(plate)
        } else if (vin.match(/^[A-Z0-9]{17}$/g)) {
            data = null//todo collectByVin
            return 'Это VIN'
        }

        if (!data) {
            return res.code(400).type('text/plain').send('bad request')
        }

        const {sravni, gibdd, autoins} = data
        const lastOwnership = gibdd?.ownershipPeriods?.[gibdd.ownershipPeriods.length - 1]

        const output = []

        output.push(`Гос. номер: ${autoins?.licensePlate || sravni?.carNumber || ''}`)
        output.push(`VIN: ${autoins?.vin || sravni?.vin || gibdd?.vehicle?.vin || ''}`)
        output.push(`ПТС: ${gibdd?.vehiclePassport ? `${gibdd?.vehiclePassport.number || ''} ${gibdd?.vehiclePassport.issue || ''}` : ''}`)
        sravni?.carDocument?.documentType?.toLowerCase() === 'sts' && output.push(`СТС: ${sravni?.carDocument?.series} ${sravni?.carDocument.number}, выдан ${sravni?.carDocument?.date.substring(0, 10)}`)
        output.push(`Название: ${gibdd?.vehicle?.model || autoins?.makeAndModel || `${sravni?.brand?.name} ${sravni?.model?.name}` || ''}`)
        output.push(`Категория: ${gibdd?.vehicle?.category || ''}`)
        output.push(`Цвет: ${gibdd?.vehicle?.color || ''}`)
        output.push(`Объем двигателя: ${gibdd?.vehicle?.engineVolume || ''} куб. см`)
        output.push(`Мощность: ${autoins?.powerHp || gibdd?.vehicle?.powerHp || ''} л.с.`)
        output.push(`Год выпуска: ${gibdd?.vehicle?.year || sravni?.year || ''}`)
        output.push(`Кол-во собстенников по ПТС: ${Math.ceil(gibdd?.ownershipPeriods?.length / 2) || ''}`)
        output.push(`Последний срок владения: ${lastOwnership ? `${lastOwnership.from} - ${lastOwnership.to || 'наст. время'}` : ''}`)
        autoins && output.push(`Полис ОСАГО: ${autoins?.policyId} ${autoins?.company} ${autoins?.status}, ${autoins?.hasRestrictions || ''}, собственник: ${autoins?.vehicleOwner}, страхователь: ${autoins?.policyHolder}, КБМ: ${autoins?.KBM}, регион: ${autoins?.region}, страховая премия: ${autoins?.premium}`)
        sravni?.brand && output.push(`Риск угона: ${sravni?.brand?.isPopular ? 'высокий' : 'низкий'}`)
        gibdd?.accidents?.forEach(async accident => {
            output.push(`ДТП: ${accident.AccidentDateTime}, ${accident.AccidentPlace}, ${accident.AccidentType}, кол-во участников: ${accident.VehicleAmount}`)
        })

        return output
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