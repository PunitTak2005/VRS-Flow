const { models: mockModels } = require('./mockDb');

let User, Volunteer, Event, Registration, Category, Skill, ActivityLog, ContactMessage, Announcement;

if (process.env.USE_MOCK_DB === 'true') {
  User = mockModels.User;
  Volunteer = mockModels.Volunteer;
  Event = mockModels.Event;
  Registration = mockModels.Registration;
  Category = mockModels.Category;
  Skill = mockModels.Skill;
  ActivityLog = mockModels.ActivityLog;
  ContactMessage = mockModels.ContactMessage;
  Announcement = mockModels.Announcement;
} else {
  // Real Mongoose Models
  User = require('./User');
  Volunteer = require('./Volunteer');
  Event = require('./Event');
  Registration = require('./Registration');
  Category = require('./Category');
  Skill = require('./Skill');
  ActivityLog = require('./ActivityLog');
  ContactMessage = require('./ContactMessage');
  Announcement = require('./Announcement');
}

module.exports = {
  User,
  Volunteer,
  Event,
  Registration,
  Category,
  Skill,
  ActivityLog,
  ContactMessage,
  Announcement
};
