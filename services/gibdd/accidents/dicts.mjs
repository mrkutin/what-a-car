const damageMap = {
    '01': 'передний бампер справа',
    '02': 'правая передняя дверь',
    '03': 'правая задняя дверь',
    '04': 'задний бампер справа',
    '05': 'задний бамер слева',
    '06': 'левая задняя дверь',
    '07': 'левая передняя дверь',
    '08': 'передний бампер слева',
    '09': 'крыша',
    '10': 'днище',
    '11': 'полная деформация кузова',
    '12': 'полная деформация кузова',
    '13': 'смещение переднего моста',
    '14': 'смещение заднего моста',
    '15': 'возгорание',
    '20': 'повреждение (уничтожение) VIN',

    '001': 'полная деформация кузова',
    '002': 'смещение двигателя',
    '003': 'смещение переднего моста',
    '004': 'смещение заднего моста',
    '005': 'возгорание',
    '006': 'повреждение (уничтожение) VIN',

    '110': 'правое переднее крыло (незначительное)',
    '111': 'правая передняя дверь (незначительное)',
    '112': 'правая задняя дверь (незначительное)',
    '113': 'правое заднее крыло (незначительное)',
    '114': 'задний бампер справа (незначительное)',
    '115': 'задний бампер слева (незначительное)',
    '116': 'левое заднее крыло (незначительное)',
    '117': 'левая задняя дверь (незначительное)',
    '118': 'левая передняя дверь (незначительное)',
    '119': 'левое переднее крыло (незначительное)',
    '120': 'передний бампер слева (незначительное)',
    '121': 'передний бампер справа (незначительное)',
    '122': 'капот и стекло (незначительное)',
    '123': 'крыша (незначительное)',
    '124': 'багажник (незначительное)',
    '125': 'днище (незначительное)',

    '210': 'правое переднее крыло (серьезное)',
    '211': 'правая передняя дверь (серьезное)',
    '212': 'правая задняя дверь (серьезное)',
    '213': 'правое заднее крыло (серьезное)',
    '214': 'задний бампер справа (серьезное)',
    '215': 'задний бампер слева (серьезное)',
    '216': 'левое заднее крыло (серьезное)',
    '217': 'левая задняя дверь (серьезное)',
    '218': 'левая передняя дверь (серьезное)',
    '219': 'левое переднее крыло (серьезное)',
    '220': 'передний бампер слева (серьезное)',
    '221': 'передний бампер справа (серьезное)',
    '222': 'капот и стекло (серьезное)',
    '223': 'крыша (серьезное)',
    '224': 'багажник (серьезное)',
    '225': 'днище (серьезное)',

    '130': 'передняя часть справа (незначительное)',
    '131': 'правая сторона спереди (незначительное)',
    '132': 'правая сторона в середине (незначительное)',
    '133': 'правая сторона сзади(незначительное)',
    '134': 'задняя часть справа (незначительное)',
    '135': 'задняя часть слева (незначительное)',
    '136': 'левая сторона сзади (незначительное)',
    '137': 'левая сторона в середине (незначительное)',
    '138': 'левая сторона спереди (незначительное)',
    '139': 'передняя часть слева (незначительное)',
    '140': 'крыша спереди (незначительное)',
    '141': 'крыша в середине (незначительное)',
    '142': 'крыша сзади (незначительное)',
    '143': 'днище (незначительное)',
    '144': '',

    '230': 'передняя часть справа (серьезное)',
    '231': 'правая сторона спереди (серьезное)',
    '232': 'правая сторона в середине (серьезное)',
    '233': 'правая сторона сзади(серьезное)',
    '234': 'задняя часть справа (серьезное)',
    '235': 'задняя часть слева (серьезное)',
    '236': 'левая сторона сзади (серьезное)',
    '237': 'левая сторона в середине (серьезное)',
    '238': 'левая сторона спереди (серьезное)',
    '239': 'передняя часть слева (серьезное)',
    '240': 'крыша спереди (серьезное)',
    '241': 'крыша в середине (серьезное)',
    '242': 'крыша сзади (серьезное)',
    '243': 'днище (серьезное)',
    '244': '',

    '150': 'переднее колесо слева(незначительное)',
    '151': 'двиатель слева (незначительное)',
    '152': 'заднее колесо слева (незначительное)',
    '153': 'переднее колесо справа (незначительное)',
    '154': 'двиатель справа (незначительное)',
    '155': 'заднее колесо справа (незначительное)',

    '250': 'переднее колесо слева(серьезное)',
    '251': 'двиатель слева (серьезное)',
    '252': 'заднее колесо слева (серьезное)',
    '253': 'переднее колесо справа (серьезное)',
    '254': 'двиатель справа (серьезное)',
    '255': 'заднее колесо справа (серьезное)',

    '160': 'кабина спереди справа (незначительное)',
    '161': 'тент спереди справа (незначительное)',
    '162': 'кабина справа (незначительное)',
    '163': 'шасси справа (незначительное)',
    '164': 'правый борт (незначительное)',
    '165': 'тент справа (незначительное)',
    '166': 'тент сзади справа (незначительное)',
    '167': 'задний борт справа (незначительное)',
    '168': 'шасси сзади справа (незначительное)',
    '169': 'шасси сзади слева (незначительное)',
    '170': 'задний борт слева (незначительное)',
    '171': 'тент сзади слева (незначительное)',
    '172': 'тент слева (незначительное)',
    '173': 'левый борт (незначительное)',
    '174': 'шасси слева (незначительное)',
    '175': 'кабина слева (незначительное)',
    '176': 'кабина спереди слева (незначительное)',
    '177': 'тент спереди слева (незначительное)',
    '178': 'крыша кабины (незначительное)',
    '179': 'крыша тента (незначительное)',
    '180': 'днище (незначительное)',

    '260': 'кабина спереди справа (серьезное)',
    '261': 'тент спереди справа (серьезное)',
    '262': 'кабина справа (серьезное)',
    '263': 'шасси справа (серьезное)',
    '264': 'правый борт (серьезное)',
    '265': 'тент справа (серьезное)',
    '266': 'тент сзади справа (серьезное)',
    '267': 'задний борт справа (серьезное)',
    '268': 'шасси сзади справа (серьезное)',
    '269': 'шасси сзади слева (серьезное)',
    '270': 'задний борт слева (серьезное)',
    '271': 'тент сзади слева (серьезное)',
    '272': 'тент слева (серьезное)',
    '273': 'левый борт (серьезное)',
    '274': 'шасси слева (серьезное)',
    '275': 'кабина слева (серьезное)',
    '276': 'кабина спереди слева (серьезное)',
    '277': 'тент спереди слева (серьезное)',
    '278': 'крыша кабины (серьезное)',
    '279': 'крыша тента (серьезное)',
    '280': 'днище (серьезное)',

    '191': 'правый передний бок (незначительное)',
    '192': 'правый задний бок (незначительное)',
    '193': 'правый задний угол (незначительное)',
    '194': 'левый задний угол (незначительное)',
    '195': 'левый задний бок (незначительное)',
    '196': 'левый передний бок (незначительное)',
    '197': 'левый передний угол (незначительное)',
    '198': 'крыша (незначительное)',
    '199': 'днище (незначительное)',

    '291': 'правый передний бок (серьезное)',
    '292': 'правый задний бок (серьезное)',
    '293': 'правый задний угол (серьезное)',
    '294': 'левый задний угол (серьезное)',
    '295': 'левый задний бок (серьезное)',
    '296': 'левый передний бок (серьезное)',
    '297': 'левый передний угол (серьезное)',
    '298': 'крыша (серьезное)',
    '299': 'днище (серьезное)'
}

export {damageMap}