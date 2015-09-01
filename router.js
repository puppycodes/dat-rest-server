var Router = require('http-hash-router')
var fs = require('fs')
var path = require('path')
var debug = require('debug')('dat-rest-server')
var pump = require('pump')
var ndjson = require('ndjson')
var url = require('url')
var createExportStream = require('dat/lib/export.js')
var createImportStream = require('dat/lib/import.js')

module.exports = function createRouter () {
  var router = Router()

  router.set('/', function (req, res, opts, cb) {
    if (req.method === 'POST') {
      pump(req, opts.readonly ? opts.db.push() : opts.db.replicate(), res)
    } else {
      res.statuscode = 405
      res.end('use POST for replication')
    }
  })

  router.set('/health', function (req, res, opts, cb) {
    var response = fs.readFileSync(path.join(__dirname, 'index.html')).toString()
    res.end(response)
  })

  router.set('/changes', function (req, res, opts, cb) {
    var args = argparse(req)
    args.values = true
    return pump(opts.db.createChangesStream(args), ndjson.serialize(), res, function (err) {
      if (err) throw err
    })
  })

  router.set('/datasets', function (req, res, opts, cb) {
    opts.db.listDatasets(function (err, datasets) {
      if (err) abort(err, args)
      res.end(JSON.stringify(datasets))
    })
  })

  router.set('/datasets/:dataset', function (req, res, opts, cb) {
    var args = argparse(req)
    args.dataset = opts.params.dataset
    if (!args.format) args.format = 'ndjson'

    if (req.method === 'GET') return pump(createExportStream(opts.db, args), res)
    else return pump(req, createImportStream(opts.db, args), function done (err) {
      if (err) return cb(err)
      res.end(opts.db.head)
    })
  })

  return router
}

function argparse (req) {
  var parsedUrl = url.parse(req.url, true);
  return parsedUrl.query
}