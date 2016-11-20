'use strict';

const adsOverview = require('../models/adsOverview');
const model = require('../models/data'),
    DCS = ['NA', 'EU', 'AS'],
    FIRST = Date.parse('2016-01-01T00:00'),
    LAST = Date.parse('2017-01-01T00:00'),
    request = require('request-promise');

module.exports = function(router) {
    function validateDC(v) {
        return typeof v === 'string' && DCS.indexOf(v) !== -1;
    }

    function validateServer(v) {
        return typeof v === 'string' &&
            (v === 'ALL' || v.match(/^[A-Z]{2}[0-9]{4}$/));
    }

    function validateTime(v) {
        v = Number(v);

        return v >= FIRST && v <= LAST;
    }

    function badVerb(req, res, next) {
        res.status(405).json({
            message: 'INCORRECT_HTTP_VERB'
        });
    }

    router.route('/').get((req, res, next) => {
        res.json({
            message: 'OK'
        });
    }).all(badVerb);

    router.route('/servers').get((req, res, next) => {
        res.json({
            message: 'OK',
            data: model.getServerData()
        });
    }).all(badVerb);

    router.route('/ads/overview').get((req, res, next) => {
        res.json({
            message: 'OK',
            data: adsOverview(),
        });
    }).all(badVerb);

    router.route('/performance').get((req, res, next) => {
        const q = req.query;

        let errs = [];

        if (!q.dc) {
            errs.push({
                code: 'PARAMETER REQUIRED',
                param: 'dc'
            });
        } else if (!validateDC(q.dc)) {
            errs.push({
                code: 'INVALID_VALUE',
                param: 'dc'
            });
        }

        if (!q.id) {
            errs.push({
                code: 'PARAMETER_REQUIRED',
                param: 'id'
            });
        } else if (!validateServer(q.id)) {
            errs.push({
                code: 'INVALID_VALUE',
                param: 'id'
            });
        }

        if (!q.from) {
            q.from = FIRST;
        } else if (!validateTime(q.from)) {
            errs.push({
                code: 'INVALID_VALUE',
                param: 'from'
            });
        } else {
            q.to = Number(q.to);
        }

        if (!q.to) {
            q.to = LAST;
        } else if (!validateTime(q.to)) {
            errs.push({
                code: 'INVALID_VALUE',
                param: 'to'
            });
        } else {
            q.to = Number(q.to);
        }

        if (errs.length) {
            return res.status(400).json({
                message: 'VALIDATION_FAILED',
                errors: errs
            });
        }

        res.json({
            message: 'OK',
            data: model.getPerformanceData(q.dc, q.id, q.from, q.to)
        });
    }).all(badVerb);

    router.route('/impressions').get((req, res, next) => {
        const q = req.query;

        let errs = [];

        if (!q.dc) {
            errs.push({
                code: 'PARAMETER REQUIRED',
                param: 'dc'
            });
        } else if (!validateDC(q.dc)) {
            errs.push({
                code: 'INVALID_VALUE',
                param: 'dc'
            });
        }

        if (!q.from) {
            q.from = FIRST;
        } else if (!validateTime(q.from)) {
            errs.push({
                code: 'INVALID_VALUE',
                param: 'from'
            });
        } else {
            q.to = Number(q.to);
        }

        if (!q.to) {
            q.to = LAST;
        } else if (!validateTime(q.to)) {
            errs.push({
                code: 'INVALID_VALUE',
                param: 'to'
            });
        } else {
            q.to = Number(q.to);
        }

        if (errs.length) {
            return res.status(400).json({
                message: 'VALIDATION_FAILED',
                errors: errs
            });
        }

        res.json({
            message: 'OK',
            data: model.getAdsData(q.dc, q.from, q.to)
        });
    }).all(badVerb);

    router.route('/getUnitImpressions/:dc').get((req, res, next) => {
        var options = {
            uri: 'http://localhost:8000/impressions?dc=' + req.params.dc,
            json: true
        };

        request(options)
            .then(function(result) {
                var unitPrice = [];
                result.data.forEach(function(item) {
                    var unitPriceItem = {};
                    for (var i in unitPrice) {
                        if (unitPrice[i]['platform-format'] == item.platform + "-" + item.format) {
                            unitPriceItem = unitPrice[i];
                            break;
                        }
                    }

                    if (Object.keys(unitPriceItem) == 0) {
                        unitPriceItem['platform-format'] = item.platform + "-" + item.format;
                        unitPriceItem['data'] = [{
                            'timestamp': item.timestamp,
                            'unitprice': item.impressions / item.spend
                        }]
                        unitPrice.push(unitPriceItem);
                    } else {
                        unitPriceItem['data'].push({
                            'timestamp': item.timestamp,
                            'unitprice': item.impressions / item.spend
                        });
                    }
                });
                res.json({
                    message: 'OK',
                    data: unitPrice
                });
            }).catch(function(err) {
                return res.status(400).json({
                    message: "QUERY FAILED",
                    errors: err
                });
            });
    }).all(badVerb);

    // Query for to and from date can be used.
    router.route('/getAvgPerformance/:dc').get((req, res, next) => {
        var q = req.query;
        if (!q.from) {
            q.from = FIRST
        }

        if (!q.to) {
            q.to = LAST
        }

        var query = 'http://localhost:8000/performance?dc=' + req.params.dc + '&id=ALL' + '&to=' + q.to + '&from=' + q.from;
        var options = {
            uri: query,
            json: true
        }

        request(options)
            .then(function(result) {
                var dataPerformance = [];
                var totalMean = 0,
                    totalLag = 0,
                    totalWarns = 0,
                    num = 0;

                result.data.forEach((item) => {
                    totalMean += item.mean;
                    totalLag += item.lag;
                    totalWarns += item.warns;
                    num++;
                });

                dataPerformance.push({
                    'avgMean': totalMean / num,
                    'avgLag': totalLag / num,
                    'avgWarns': totalWarns / num
                });

                res.json({
                    message: 'OK',
                    data: dataPerformance
                });
            }).catch(function(err) {
                return res.status(400).json({
                    message: "QUERY FAILED",
                    errors: err
                });
            });
    }).all(badVerb);

    router.route('/serverHealth').get((req, res, next) => {
        var options = {
            uri: 'http://localhost:8000/servers',
            json: true
        };

        request(options)
            .then((result) => {
                var dataHealth = [];
                result.data.forEach((item) => {
                    var healthItem = {};
                    for (var i in dataHealth) {
                        if (dataHealth[i]['dc'] == item.dc) {
                            healthItem = dataHealth[i];
                            break;
                        }
                    }

                    var input = {
                        'id': item.id,
                        'status': item.status
                    };

                    if (Object.keys(healthItem) == 0) {
                        dataHealth.push({
                            'dc': item.dc,
                            'health': [input]
                        });
                    } else {
                        healthItem.health.push(input);
                    }

                });

                res.json({
                    message: 'OK',
                    data: dataHealth
                });
            }).catch(function(err) {
                return res.status(400).json({
                    message: "QUERY FAILED",
                    errors: err
                });
            });
    }).all(badVerb);
};