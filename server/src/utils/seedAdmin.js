const bcrypt = require('bcryptjs');
const { User } = require('../models');

const seedDefaultAdmin = async () => {
  try {
    const adminEmail = 'admin@volunteersystem.local';
    const adminExists = await User.findOne({ email: adminEmail });

    if (adminExists) {
      console.log('ℹ️ Default administrator account already exists.');
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('123456', salt);

    await User.create({
      name: 'Admin',
      role: 'admin',
      email: adminEmail,
      password: hashedPassword,
      phoneNumber: '9999999999',
      status: 'Active',
      isEmailVerified: true
    });

    console.log(`✅ Default administrator account created.
Email: ${adminEmail}`);
  } catch (error) {
    console.error(`❌ Failed to seed default admin: ${error.message}`);
  }
};

module.exports = { seedDefaultAdmin };
