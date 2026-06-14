require('dotenv').config();
const bcrypt = require('bcryptjs');
const { User, Volunteer, Event, Registration, Category, Skill, ActivityLog } = require('../models');

const seedMockData = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data (if mongoose is running, delete collections. If mock, mockDb already handles deleteMany)
    await User.deleteMany({});
    await Volunteer.deleteMany({});
    await Event.deleteMany({});
    await Registration.deleteMany({});
    await Category.deleteMany({});
    await Skill.deleteMany({});
    await ActivityLog.deleteMany({});

    // Hash default password
    const salt = await bcrypt.genSalt(10);
    const defaultPassword = await bcrypt.hash('VolunteerPass123!', salt);
    const adminPassword = await bcrypt.hash('AdminPass123!', salt);

    // 1. Seed Categories
    const categories = await Category.create([
      { name: 'Environment', description: 'Eco-friendly and green preservation initiatives.' },
      { name: 'Education', description: 'Teaching, literacy drives, and tutoring programs.' },
      { name: 'Healthcare', description: 'Medical camps, blood drives, and healthy living support.' },
      { name: 'Disaster Relief', description: 'Crisis response, supplies sorting, and emergency support.' },
      { name: 'Community Outreach', description: 'Shelter support, local soup kitchens, and neighborhood helper drives.' }
    ]);
    console.log(`✅ Seeded ${categories.length} Categories`);

    // 2. Seed Skills
    const skills = await Skill.create([
      { name: 'First Aid & CPR', description: 'Certified emergency medical assistance.' },
      { name: 'Teaching & Mentoring', description: 'Pedagogic guidance and tutoring experience.' },
      { name: 'Event Coordination', description: 'Managing logistics, guest list, and schedules.' },
      { name: 'Translation', description: 'Bilingual translation and interpretation.' },
      { name: 'Web Development', description: 'HTML, CSS, JS, and server management skills.' },
      { name: 'Public Speaking', description: 'Presenting and leading communication drives.' }
    ]);
    console.log(`✅ Seeded ${skills.length} Skills`);

    // 3. Seed Admin User
    const adminUser = await User.create({
      name: 'System Admin',
      email: 'admin@volunteersystem.com',
      password: adminPassword,
      role: 'admin',
      isEmailVerified: true
    });
    console.log('✅ Seeded Admin User: admin@volunteersystem.com');

    // 4. Seed Volunteer Users & Profiles
    // APPROVED Volunteer
    const volUser1 = await User.create({
      name: 'John Doe',
      email: 'volunteer@volunteersystem.com',
      password: defaultPassword,
      role: 'volunteer',
      isEmailVerified: true
    });

    const vol1 = await Volunteer.create({
      userId: volUser1._id,
      phone: '555-0199',
      dob: new Date('1994-06-15'),
      gender: 'male',
      address: { street: '123 Pine St', city: 'Metropolis', state: 'NY', country: 'USA', pincode: '10001' },
      emergencyContact: { name: 'Jane Doe', relation: 'Spouse', phone: '555-0200' },
      skills: ['Teaching & Mentoring', 'Public Speaking'],
      education: 'Bachelors in Science',
      occupation: 'Science Teacher',
      availability: ['weekends', 'evenings'],
      preferredCategory: 'Education',
      previousExperience: 'Taught elementary science during summer camps.',
      languages: ['English', 'Spanish'],
      profilePicture: '/uploads/profile_pics/default.png',
      govIdFile: '',
      motivationStatement: 'I want to give back to the youth in my community.',
      approvalStatus: 'approved',
      volunteerHours: 12,
      badges: ['Bronze Contributor'],
      termsAccepted: true
    });

    // PENDING Volunteer
    const volUser2 = await User.create({
      name: 'Alice Smith',
      email: 'pending@volunteersystem.com',
      password: defaultPassword,
      role: 'volunteer',
      isEmailVerified: false
    });

    const vol2 = await Volunteer.create({
      userId: volUser2._id,
      phone: '555-0144',
      dob: new Date('1998-12-05'),
      gender: 'female',
      address: { street: '456 Oak Ave', city: 'Metropolis', state: 'NY', country: 'USA', pincode: '10002' },
      emergencyContact: { name: 'Bob Smith', relation: 'Father', phone: '555-0145' },
      skills: ['First Aid & CPR', 'Event Coordination'],
      education: 'Undergraduate Student',
      occupation: 'Student',
      availability: ['weekdays', 'weekends'],
      preferredCategory: 'Healthcare',
      previousExperience: 'Red Cross blood drive organizer.',
      languages: ['English'],
      profilePicture: '/uploads/profile_pics/default.png',
      govIdFile: '',
      motivationStatement: 'Looking to gain experience in healthcare management.',
      approvalStatus: 'pending',
      volunteerHours: 0,
      badges: [],
      termsAccepted: true
    });

    // REJECTED Volunteer
    const volUser3 = await User.create({
      name: 'Robert Vance',
      email: 'rejected@volunteersystem.com',
      password: defaultPassword,
      role: 'volunteer',
      isEmailVerified: true
    });

    const vol3 = await Volunteer.create({
      userId: volUser3._id,
      phone: '555-0177',
      dob: new Date('1985-03-20'),
      gender: 'male',
      address: { street: '789 Maple Rd', city: 'Metropolis', state: 'NY', country: 'USA', pincode: '10003' },
      emergencyContact: { name: 'Phyllis Vance', relation: 'Spouse', phone: '555-0178' },
      skills: ['Web Development'],
      education: 'High School',
      occupation: 'Self-employed',
      availability: ['flexible'],
      preferredCategory: 'Environment',
      previousExperience: 'None',
      languages: ['English'],
      profilePicture: '/uploads/profile_pics/default.png',
      govIdFile: '',
      motivationStatement: 'Bored and looking for things to do.',
      approvalStatus: 'rejected',
      rejectionReason: 'Application does not present appropriate commitment or skills matching community guidelines.',
      volunteerHours: 0,
      badges: [],
      termsAccepted: true
    });

    console.log('✅ Seeded Volunteer Profiles');

    // 5. Seed Events
    const event1 = await Event.create({
      title: 'Green City Tree Plantation',
      description: 'Join us to plant 500 trees in the urban parks around the city center. Refreshments and tools will be provided.',
      category: 'Environment',
      skillsRequired: ['Event Coordination'],
      date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      startTime: '09:00',
      endTime: '13:00',
      location: 'Central Park East, Sector 4',
      capacity: 50,
      status: 'upcoming',
      image: '/assets/tree_plantation.png'
    });

    const event2 = await Event.create({
      title: 'Children Literacy Drive',
      description: 'Help tutor elementary children who need extra guidance with their reading comprehension and math skills.',
      category: 'Education',
      skillsRequired: ['Teaching & Mentoring'],
      date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      startTime: '14:00',
      endTime: '17:00',
      location: 'Downtown Library Annex',
      capacity: 20,
      status: 'upcoming',
      image: '/assets/children_literacy_drive.png'
    });

    const event3 = await Event.create({
      title: 'City Blood Donation Camp',
      description: 'Assisting medical workers in patient queues, details form entry, and sorting post-donation juice packs.',
      category: 'Healthcare',
      skillsRequired: ['First Aid & CPR', 'Event Coordination'],
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago (completed)
      startTime: '08:00',
      endTime: '14:00',
      location: 'Community Hospital Gym',
      capacity: 10,
      status: 'completed'
    });

    const event4 = await Event.create({
      title: 'Community Soups Kitchen',
      description: 'Assist in food preparation and serving local shelters.',
      category: 'Community Outreach',
      skillsRequired: ['Event Coordination'],
      date: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // 8 days from now
      startTime: '11:00',
      endTime: '15:00',
      location: 'Mercy Soup Kitchen',
      capacity: 15,
      status: 'upcoming',
      image: '/assets/community_soup_kitchen.png'
    });

    console.log('✅ Seeded Events');

    // 6. Seed Registrations
    // John Doe registered for Tree Plantation (upcoming)
    const reg1 = await Registration.create({
      eventId: event1._id,
      volunteerId: vol1._id,
      status: 'registered',
      hoursLogged: 0
    });
    await Event.findByIdAndUpdate(event1._id, { $push: { assignedVolunteers: vol1._id } });

    // John Doe registered & attended Blood Donation (completed)
    const reg2 = await Registration.create({
      eventId: event3._id,
      volunteerId: vol1._id,
      status: 'attended',
      hoursLogged: 6
    });
    await Event.findByIdAndUpdate(event3._id, { $push: { assignedVolunteers: vol1._id } });

    console.log('✅ Seeded Registrations');



    // 7. Seed Activity Logs
    await ActivityLog.create([
      { userId: adminUser._id, action: 'system_init', details: 'Database initialized with seeded configuration.', ipAddress: '127.0.0.1' },
      { userId: volUser1._id, action: 'user_register', details: 'Profile auto-approved during seeding.', ipAddress: '127.0.0.1' },
      { userId: volUser1._id, action: 'register_event', details: `Signed up for ${event1.title}`, ipAddress: '127.0.0.1' }
    ]);
    console.log('✅ Seeded Activity Audit Logs');
    console.log('🌱 Seeding Completed Successfully! All systems ready.');
  } catch (error) {
    console.error(`❌ Error seeding database: ${error.message}`);
  }
};

// If run directly via node command line
if (require.main === module) {
  const connectDB = require('../config/db');
  
  connectDB().then(async () => {
    await seedMockData();
    if (process.env.USE_MOCK_DB !== 'true') {
      const mongoose = require('mongoose');
      mongoose.disconnect();
    }
  });
}

module.exports = { seedMockData };
