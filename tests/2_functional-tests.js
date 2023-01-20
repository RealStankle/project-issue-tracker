const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function () {
  let issueId1, issueId2;

  test('POST /api/issues/{project}, with every field', async () => {
    const issue = {
      issue_title: 'test title',
      issue_text: 'test text',
      created_by: 'tester',
      assigned_to: 'another tester',
      status_text: 'error',
    };

    const response = await chai
      .request(server)
      .post('/api/issues/test-project')
      .send(issue);

    issueId1 = response.body._id;

    assert.strictEqual(response.status, 201);
    assert.include(response.body, issue);
    assert.property(response.body, 'open');
    assert.property(response.body, 'created_on');
    assert.property(response.body, 'updated_on');
  });

  test('POST /api/issues/{project}, with only required fields', async () => {
    const issue = {
      issue_title: 'another test title',
      issue_text: 'another test text',
      created_by: 'another tester',
    };

    const response = await chai
      .request(server)
      .post('/api/issues/test-project')
      .send(issue);

    issueId2 = response.body._id;

    assert.strictEqual(response.status, 201);
    assert.include(response.body, issue);
    assert.include(response.body, { assigned_to: '', status_text: '' });
    assert.property(response.body, 'open');
    assert.property(response.body, 'created_on');
    assert.property(response.body, 'updated_on');
  });

  test('POST /api/issues/{project}, with missing required fields', async () => {
    const issue = {
      issue_title: 'test title without issue text',
      created_by: 'tester',
    };

    const response = await chai
      .request(server)
      .post('/api/issues/test-project')
      .send(issue);

    assert.strictEqual(response.status, 200);
    assert.deepEqual(response.body, { error: 'required field(s) missing' });
  });

  test('GET /api/issues/{project}', async () => {
    const response = await chai.request(server).get('/api/issues/test-project');

    assert.strictEqual(response.status, 200);
    assert.typeOf(response.body, 'array');
  });

  test('GET /api/issues/{project}, with one filter', async () => {
    const query = { issue_title: 'test title' };

    const response = await chai
      .request(server)
      .get('/api/issues/test-project')
      .query(query);

    assert.strictEqual(response.status, 200);
    assert.typeOf(response.body, 'array');
    assert.include(response.body[0], query);
  });

  test('GET /api/issues/{project}, with multiple filters', async () => {
    const query = {
      issue_title: 'another test title',
      created_by: 'another tester',
    };

    const response = await chai
      .request(server)
      .get('/api/issues/test-project')
      .query(query);

    assert.strictEqual(response.status, 200);
    assert.typeOf(response.body, 'array');
    assert.include(response.body[0], query);
  });

  test('PUT /api/issues/{projectname}, with one field', async () => {
    const updateObject = {
      _id: issueId1,
      issue_title: 'modified test title',
    };

    const response = await chai
      .request(server)
      .put('/api/issues/test-project')
      .send(updateObject);

    assert.strictEqual(response.status, 200);
    assert.deepEqual(response.body, {
      result: 'successfully updated',
      _id: issueId1,
    });

    const {
      body: [updatedIssue],
    } = await chai
      .request(server)
      .get('/api/issues/test-project')
      .query(updateObject);

    assert.include(updatedIssue, updateObject);
  });

  test('PUT /api/issues/{projectname}, with multiple fields', async () => {
    const updateObject = {
      _id: issueId2,
      issue_title: 'modified test title',
      issue_text: 'modified test text',
      open: false,
    };

    const response = await chai
      .request(server)
      .put('/api/issues/test-project')
      .send(updateObject);

    assert.strictEqual(response.status, 200);
    assert.deepEqual(response.body, {
      result: 'successfully updated',
      _id: issueId2,
    });

    const {
      body: [updatedIssue],
    } = await chai
      .request(server)
      .get('/api/issues/test-project')
      .query(updateObject);

    assert.include(updatedIssue, updateObject);
  });

  test('PUT /api/issues/{projectname}, with missing _id', async () => {
    const response = await chai
      .request(server)
      .put('/api/issues/test-project')
      .send({
        issue_title: 'modified title without id',
        issue_text: 'modified text without id',
        open: false,
      });

    assert.strictEqual(response.status, 200);
    assert.deepEqual(response.body, { error: 'missing _id' });
  });

  test('PUT /api/issues/{projectname}, with no fields to update', async () => {
    const response = await chai
      .request(server)
      .put('/api/issues/test-project')
      .send({
        _id: issueId1,
      });

    assert.strictEqual(response.status, 200);
    assert.deepEqual(response.body, {
      error: 'no update field(s) sent',
      _id: issueId1,
    });
  });

  test('PUT /api/issues/{projectname}, with an invalid _id', async () => {
    const invalidId = `${issueId1.slice(-3)}abc`;

    const response = await chai
      .request(server)
      .put('/api/issues/test-project')
      .send({
        _id: invalidId,
        issue_title: 'modified title with wrong id',
      });

    assert.strictEqual(response.status, 200);
    assert.deepEqual(response.body, {
      error: 'could not update',
      _id: invalidId,
    });
  });

  test('DELETE /api/issues/{project}', async () => {
    const response = await chai
      .request(server)
      .delete('/api/issues/test-project')
      .send({
        _id: issueId1,
      });

    assert.strictEqual(response.status, 200);
    assert.deepEqual(response.body, {
      result: 'successfully deleted',
      _id: issueId1,
    });

    const { body } = await chai
      .request(server)
      .get('/api/issues/test-project')
      .query({ _id: issueId1 });

    assert.isEmpty(body);
  });

  test('DELETE /api/issues/{project}, with an invalid _id', async () => {
    const invalidId = `${issueId2.slice(-3)}abc`;
    const response = await chai
      .request(server)
      .delete('/api/issues/test-project')
      .send({
        _id: invalidId,
      });

    assert.strictEqual(response.status, 200);
    assert.deepEqual(response.body, {
      error: 'could not delete',
      _id: invalidId,
    });
  });

  test('DELETE /api/issues/{project}, with missing _id', async () => {
    const response = await chai
      .request(server)
      .delete('/api/issues/test-project');

    assert.strictEqual(response.status, 200);
    assert.deepEqual(response.body, { error: 'missing _id' });
  });
});
