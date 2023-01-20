'use strict';

const mongoose = require('mongoose');
const Project = require('../models/project.model');

module.exports = function (app) {
  mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME });

  app
    .route('/api/issues/:project')

    .get(async function (req, res) {
      let project = req.params.project;

      const conditions = Object.entries(req.query).map(([key, value]) => {
        if (key === 'open' && /^(true|false)$/.test(value)) {
          value = eval(value);
        }

        if (key === 'created_on' || key === 'updated_on') {
          value = new Date(value);
        }

        if (key === '_id') {
          value = new mongoose.Types.ObjectId(value);
        }

        return {
          $eq: [`$$issue.${key}`, value],
        };
      });

      const result = await Project.aggregate([
        { $match: { name: project } },
        {
          $project: {
            items: {
              $filter: {
                input: '$issues',
                as: 'issue',
                cond: { $and: conditions },
              },
            },
          },
        },
      ]);

      res.status(200).json(result[0].items);
    })

    .post(async function (req, res) {
      const project = req.params.project;
      const { issue_title, issue_text, created_by } = req.body;

      if (!issue_title || !issue_text || !created_by) {
        return res.status(200).json({ error: 'required field(s) missing' });
      }

      const { issues } = await Project.findOneAndUpdate(
        { name: project },
        {
          $push: {
            issues: { ...req.body },
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      res.status(201).json(issues[issues.length - 1]);
    })

    .put(async function (req, res) {
      let project = req.params.project;

      if (!req.body.hasOwnProperty('_id')) {
        return res.status(200).json({ error: 'missing _id' });
      }

      if (Object.keys(req.body).length == 1) {
        return res
          .status(200)
          .json({ error: 'no update field(s) sent', _id: req.body._id });
      }

      const setObj = Object.entries(req.body).reduce(
        (object, [key, value]) => {
          if (key === 'open' && /^(true|false)$/.test(value)) {
            value = eval(value);
          }

          if (key === '_id') {
            return { ...object };
          }

          return {
            ...object,
            [`issues.$.${key}`]: value,
          };
        },
        { 'issues.$.updated_on': new Date() }
      );

      try {
        const updatedProject = await Project.findOneAndUpdate(
          { name: project, 'issues._id': req.body._id },
          { $set: { ...setObj } }
        );

        if (!updatedProject) {
          throw new Error();
        }

        res
          .status(200)
          .json({ result: 'successfully updated', _id: req.body._id });
      } catch {
        res.status(200).json({ error: 'could not update', _id: req.body._id });
      }
    })

    .delete(async function (req, res) {
      let project = req.params.project;

      if (!req.body.hasOwnProperty('_id')) {
        return res.status(200).json({ error: 'missing _id' });
      }

      try {
        const updatedProject = await Project.findOneAndUpdate(
          { name: project, 'issues._id': req.body._id },
          {
            $pull: {
              issues: { _id: new mongoose.Types.ObjectId(req.body._id) },
            },
          }
        );

        if (!updatedProject) {
          throw new Error();
        }

        res
          .status(200)
          .json({ result: 'successfully deleted', _id: req.body._id });
      } catch {
        res.status(200).json({ error: 'could not delete', _id: req.body._id });
      }
    });
};
