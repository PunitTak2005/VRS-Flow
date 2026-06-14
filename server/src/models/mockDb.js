const { ObjectId } = require('mongoose').Types;

// In-memory data store
const dbStore = {
  User: [],
  Volunteer: [],
  Event: [],
  Registration: [],
  Category: [],
  Skill: [],
  ActivityLog: [],
  ContactMessage: [],
  Announcement: []
};

// Helper to get nested properties (e.g. 'address.city')
const getNestedValue = (obj, path) => {
  if (!obj) return undefined;
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

// Helper to match Mongoose query operators
const matchQuery = (item, query) => {
  if (!query || Object.keys(query).length === 0) return true;

  for (const [key, targetValue] of Object.entries(query)) {
    if (key === '$or') {
      if (!Array.isArray(targetValue)) continue;
      if (!targetValue.some(q => matchQuery(item, q))) return false;
      continue;
    }
    if (key === '$and') {
      if (!Array.isArray(targetValue)) continue;
      if (!targetValue.every(q => matchQuery(item, q))) return false;
      continue;
    }

    const itemValue = getNestedValue(item, key);

    if (targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue) && !(targetValue instanceof RegExp)) {
      for (const [op, val] of Object.entries(targetValue)) {
        if (op === '$in') {
          const arr = Array.isArray(itemValue) ? itemValue : [itemValue];
          const stringifiedVal = val.map(v => v.toString());
          if (!arr.some(v => v && stringifiedVal.includes(v.toString()))) return false;
        } else if (op === '$nin') {
          const arr = Array.isArray(itemValue) ? itemValue : [itemValue];
          const stringifiedVal = val.map(v => v.toString());
          if (arr.some(v => v && stringifiedVal.includes(v.toString()))) return false;
        } else if (op === '$regex') {
          const options = targetValue.$options || '';
          const regex = new RegExp(val, options);
          if (!regex.test(String(itemValue || ''))) return false;
        } else if (op === '$gte') {
          if (!(new Date(itemValue) >= new Date(val))) return false;
        } else if (op === '$lte') {
          if (!(new Date(itemValue) <= new Date(val))) return false;
        } else if (op === '$gt') {
          if (!(new Date(itemValue) > new Date(val))) return false;
        } else if (op === '$lt') {
          if (!(new Date(itemValue) < new Date(val))) return false;
        } else if (op === '$ne') {
          if (itemValue && val && itemValue.toString() === val.toString()) return false;
          if (itemValue !== val) return false;
        }
      }
    } else if (targetValue instanceof RegExp) {
      if (!targetValue.test(String(itemValue || ''))) return false;
    } else {
      // Direct comparison
      if (itemValue && targetValue && (itemValue.toString() === targetValue.toString() || itemValue === targetValue)) {
        // match
      } else if (itemValue !== targetValue) {
        return false;
      }
    }
  }
  return true;
};

class QueryChain {
  constructor(data, modelName) {
    this.data = JSON.parse(JSON.stringify(data)); // Deep clone to prevent direct editing
    this.modelName = modelName;
  }

  populate(path) {
    let populatePaths = [];
    if (typeof path === 'string') {
      populatePaths = [path];
    } else if (Array.isArray(path)) {
      populatePaths = path;
    } else if (path && path.path) {
      populatePaths = [path.path];
    }

    this.data = this.data.map(item => {
      const cloned = { ...item };
      for (const p of populatePaths) {
        const refId = cloned[p];
        let refModelName = '';

        if (p === 'userId' || p === 'user') refModelName = 'User';
        else if (p === 'volunteerId' || p === 'volunteer') refModelName = 'Volunteer';
        else if (p === 'eventId' || p === 'event') refModelName = 'Event';
        else if (p === 'preferredCategory' || p === 'category') refModelName = 'Category';
        else if (p === 'assignedVolunteers') {
          if (Array.isArray(cloned[p])) {
            cloned[p] = cloned[p].map(vid => dbStore.Volunteer.find(v => v._id.toString() === vid.toString()) || vid);
          }
          continue;
        }

        if (refModelName && dbStore[refModelName]) {
          if (Array.isArray(refId)) {
            cloned[p] = refId.map(id => dbStore[refModelName].find(refItem => refItem._id.toString() === id.toString()) || id);
          } else if (refId) {
            cloned[p] = dbStore[refModelName].find(refItem => refItem._id.toString() === refId.toString()) || refId;
          }
        }
      }
      return cloned;
    });

    return this;
  }

  select() {
    return this;
  }

  sort(options) {
    let sortObj = {};
    if (typeof options === 'string') {
      const parts = options.split(' ');
      parts.forEach(p => {
        if (p.startsWith('-')) sortObj[p.substring(1)] = -1;
        else sortObj[p] = 1;
      });
    } else {
      sortObj = options;
    }

    if (sortObj && Object.keys(sortObj).length > 0) {
      this.data.sort((a, b) => {
        for (const [key, order] of Object.entries(sortObj)) {
          const valA = getNestedValue(a, key);
          const valB = getNestedValue(b, key);
          if (valA === undefined || valA === null) return 1;
          if (valB === undefined || valB === null) return -1;

          if (valA < valB) return order === -1 ? 1 : -1;
          if (valA > valB) return order === -1 ? -1 : 1;
        }
        return 0;
      });
    }
    return this;
  }

  skip(n) {
    this.data = this.data.slice(n);
    return this;
  }

  limit(n) {
    this.data = this.data.slice(0, n);
    return this;
  }

  async exec() {
    return this.data;
  }

  then(onFulfilled, onRejected) {
    return Promise.resolve(this.data).then(onFulfilled, onRejected);
  }
}

class MockModel {
  constructor(modelName) {
    this.modelName = modelName;
  }

  get store() {
    return dbStore[this.modelName];
  }

  create(data) {
    const records = Array.isArray(data) ? data : [data];
    const created = records.map(r => {
      const doc = {
        _id: r._id || new ObjectId(),
        ...r,
        createdAt: r.createdAt || new Date(),
        updatedAt: r.updatedAt || new Date()
      };
      this.store.push(doc);
      return JSON.parse(JSON.stringify(doc));
    });
    return Promise.resolve(Array.isArray(data) ? created : created[0]);
  }

  find(query = {}) {
    const results = this.store.filter(item => matchQuery(item, query));
    return new QueryChain(results, this.modelName);
  }

  findOne(query = {}) {
    const item = this.store.find(item => matchQuery(item, query));
    const result = item ? JSON.parse(JSON.stringify(item)) : null;
    const queryResult = {
      select: () => queryResult,
      populate: (path) => {
        const chain = new QueryChain(result ? [result] : [], this.modelName);
        chain.populate(path);
        return {
          select: () => this,
          then: (onFulfilled) => Promise.resolve(chain.data[0] || null).then(onFulfilled)
        };
      },
      then: (onFulfilled) => Promise.resolve(result).then(onFulfilled)
    };
    return queryResult;
  }

  findById(id) {
    if (!id) return { then: (onFulfilled) => Promise.resolve(null).then(onFulfilled) };
    return this.findOne({ _id: id });
  }

  findByIdAndUpdate(id, update, options = {}) {
    const index = this.store.findIndex(item => item._id.toString() === id.toString());
    if (index === -1) {
      return Promise.resolve(null);
    }

    const current = this.store[index];
    const updateData = update.$set || update;

    const updated = {
      ...current,
      ...updateData,
      updatedAt: new Date()
    };

    // If update contains push
    if (update.$push) {
      for (const [key, val] of Object.entries(update.$push)) {
        if (!updated[key]) updated[key] = [];
        if (val && typeof val === 'object' && val.$each) {
          updated[key].push(...val.$each);
        } else {
          updated[key].push(val);
        }
      }
    }

    // If update contains pull
    if (update.$pull) {
      for (const [key, val] of Object.entries(update.$pull)) {
        if (Array.isArray(updated[key])) {
          updated[key] = updated[key].filter(v => v.toString() !== val.toString());
        }
      }
    }

    this.store[index] = updated;
    return Promise.resolve(JSON.parse(JSON.stringify(updated)));
  }

  findByIdAndDelete(id) {
    const index = this.store.findIndex(item => item._id.toString() === id.toString());
    if (index === -1) return Promise.resolve(null);
    const deleted = this.store.splice(index, 1)[0];
    return Promise.resolve(deleted);
  }

  updateOne(query, update) {
    const index = this.store.findIndex(item => matchQuery(item, query));
    if (index === -1) return Promise.resolve({ matchedCount: 0, modifiedCount: 0 });
    
    const current = this.store[index];
    const updateData = update.$set || update;
    this.store[index] = {
      ...current,
      ...updateData,
      updatedAt: new Date()
    };
    return Promise.resolve({ matchedCount: 1, modifiedCount: 1 });
  }

  deleteOne(query) {
    const index = this.store.findIndex(item => matchQuery(item, query));
    if (index === -1) return Promise.resolve({ deletedCount: 0 });
    this.store.splice(index, 1);
    return Promise.resolve({ deletedCount: 1 });
  }

  deleteMany(query = {}) {
    let deletedCount = 0;
    for (let i = this.store.length - 1; i >= 0; i--) {
      if (matchQuery(this.store[i], query)) {
        this.store.splice(i, 1);
        deletedCount++;
      }
    }
    return Promise.resolve({ deletedCount });
  }

  countDocuments(query = {}) {
    const count = this.store.filter(item => matchQuery(item, query)).length;
    return Promise.resolve(count);
  }

  async aggregate(pipeline = []) {
    // Basic aggregation matching for specific report aggregations
    // Reports require gender/age distribution, daily registrations, active volunteers.
    let results = JSON.parse(JSON.stringify(this.store));

    for (const stage of pipeline) {
      if (stage.$match) {
        results = results.filter(item => matchQuery(item, stage.$match));
      } else if (stage.$group) {
        const groupKey = stage.$group._id;
        const groupings = {};
        
        results.forEach(item => {
          let keyVal;
          if (typeof groupKey === 'string' && groupKey.startsWith('$')) {
            const path = groupKey.substring(1);
            // check for special projections
            if (path === 'gender') {
              keyVal = item.gender || 'Unknown';
            } else if (path === 'createdAt') {
              // group by date string
              keyVal = item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : 'Unknown';
            } else {
              keyVal = getNestedValue(item, path);
            }
          } else if (groupKey && typeof groupKey === 'object') {
            // e.g. { day: { $dayOfMonth: "$createdAt" }, month: { $month: "$createdAt" }, year: { $year: "$createdAt" } }
            // return date string grouping for simplicity
            const dateVal = item.createdAt ? new Date(item.createdAt) : new Date();
            keyVal = `${dateVal.getFullYear()}-${String(dateVal.getMonth() + 1).padStart(2, '0')}-${String(dateVal.getDate()).padStart(2, '0')}`;
          } else {
            keyVal = 'All';
          }

          if (!groupings[keyVal]) {
            groupings[keyVal] = { _id: keyVal, count: 0 };
            // initialize sums
            for (const [field, groupOp] of Object.entries(stage.$group)) {
              if (field === '_id') continue;
              if (groupOp.$sum) groupings[keyVal][field] = 0;
            }
          }

          groupings[keyVal].count++;
          
          for (const [field, groupOp] of Object.entries(stage.$group)) {
            if (field === '_id') continue;
            if (groupOp.$sum) {
              const sumVal = typeof groupOp.$sum === 'number' ? groupOp.$sum : (getNestedValue(item, groupOp.$sum.substring(1)) || 0);
              groupings[keyVal][field] += sumVal;
            }
          }
        });

        results = Object.values(groupings);
      } else if (stage.$sort) {
        // sort groupings
        const sortFields = stage.$sort;
        results.sort((a, b) => {
          for (const [key, order] of Object.entries(sortFields)) {
            if (a[key] < b[key]) return order === -1 ? 1 : -1;
            if (a[key] > b[key]) return order === -1 ? -1 : 1;
          }
          return 0;
        });
      } else if (stage.$limit) {
        results = results.slice(0, stage.$limit);
      }
    }

    return Promise.resolve(results);
  }
}

// Generate models mapping
const models = {};
Object.keys(dbStore).forEach(modelName => {
  models[modelName] = new MockModel(modelName);
});

module.exports = {
  dbStore,
  models
};
