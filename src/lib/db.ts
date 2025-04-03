import mongoose from 'mongoose';

// Connection URI for MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pdf-to-xml';

// Define schemas
const UserSchema = new mongoose.Schema({
  _id: { type: String }, // Allow string IDs
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, default: 'user' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false }); // Disable automatic ObjectId generation

const ConversionSchema = new mongoose.Schema({
  _id: { type: String }, // Allow string IDs
  userId: { type: String, required: true },
  filename: { type: String, required: true },
  originalUrl: { type: String, default: "" },
  convertedXml: { type: String, default: "" },
  status: { type: String, default: "PENDING" },
  fileSize: { type: Number, default: 0 },
  pageCount: { type: Number, default: 0 },
  structureType: { type: String, default: "enhanced" },
  processingTime: { type: Number },
  detectedTables: { type: Number, default: 0 },
  detectedLists: { type: Number, default: 0 },
  detectedHeadings: { type: Number, default: 0 },
  detectedImages: { type: Number, default: 0 },
  characterCount: { type: Number, default: 0 },
  wordCount: { type: Number, default: 0 },
  tags: { type: String },
  metadata: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false }); // Disable automatic ObjectId generation

// Create models
export const User = mongoose.models.User || mongoose.model('User', UserSchema);
export const Conversion = mongoose.models.Conversion || mongoose.model('Conversion', ConversionSchema);

// Database connection
const connectDB = async () => {
  try {
    // Don't attempt reconnection if we're already connected
    if (mongoose.connection.readyState === 1) {
      console.log('Already connected to MongoDB');
      return;
    }
    
    // Check if we have connection string
    if (!MONGODB_URI) {
      console.error('MongoDB connection string is not provided');
      throw new Error('MongoDB connection string is required');
    }
    
    console.log('Connecting to MongoDB...');
    
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // 5 seconds
    });
    
    console.log('Successfully connected to MongoDB');
    
    // Add connection error handler
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    // Add disconnect handler (useful for serverless environments)
    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });
    
    // Handle process termination (might not be needed in serverless, but good practice)
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    console.warn('Continuing without MongoDB. Some features may not work properly.');
    return error;
  }
};

// Auto-connect on import - change this to connect in all environments
// Modify this to always connect, even in production
connectDB();

// Prisma compatibility layer for existing routes
export const prisma = {
  user: {
    findUnique: async ({ where }) => {
      await connectDB();
      const user = await User.findOne(where);
      if (!user) return null;
      return {
        id: user._id,
        name: user.name,
        email: user.email,
        password: user.passwordHash,
        createdAt: user.createdAt
      };
    },
    findMany: async () => {
      await connectDB();
      const users = await User.find({});
      return users.map(user => ({
        id: user._id,
        name: user.name,
        email: user.email,
        password: user.passwordHash,
        createdAt: user.createdAt
      }));
    },
    create: async ({ data }) => {
      await connectDB();
      const userData = {
        name: data.name,
        email: data.email,
        passwordHash: data.password,
      };
      
      // If an ID is provided, use it
      if (data.id) {
        userData._id = data.id;
      }
      
      const user = await User.create(userData);
      return {
        id: user._id,
        name: user.name,
        email: user.email,
        password: user.passwordHash,
        createdAt: user.createdAt
      };
    }
  },
  conversion: {
    findUnique: async ({ where }) => {
      await connectDB();
      const conversion = await Conversion.findOne(where);
      if (!conversion) return null;
      return {
        id: conversion._id,
        userId: conversion.userId,
        filename: conversion.filename,
        originalUrl: conversion.originalUrl,
        convertedXml: conversion.convertedXml,
        status: conversion.status,
        fileSize: conversion.fileSize,
        pageCount: conversion.pageCount,
        structureType: conversion.structureType,
        processingTime: conversion.processingTime,
        detectedTables: conversion.detectedTables,
        detectedLists: conversion.detectedLists,
        detectedHeadings: conversion.detectedHeadings,
        detectedImages: conversion.detectedImages,
        characterCount: conversion.characterCount,
        wordCount: conversion.wordCount,
        tags: conversion.tags,
        metadata: conversion.metadata,
        createdAt: conversion.createdAt
      };
    },
    findMany: async ({ where } = {}) => {
      await connectDB();
      const conversions = await Conversion.find(where || {});
      return conversions.map(conversion => ({
        id: conversion._id,
        userId: conversion.userId,
        filename: conversion.filename,
        originalUrl: conversion.originalUrl,
        convertedXml: conversion.convertedXml,
        status: conversion.status,
        fileSize: conversion.fileSize,
        pageCount: conversion.pageCount,
        structureType: conversion.structureType,
        processingTime: conversion.processingTime,
        detectedTables: conversion.detectedTables,
        detectedLists: conversion.detectedLists,
        detectedHeadings: conversion.detectedHeadings,
        detectedImages: conversion.detectedImages,
        characterCount: conversion.characterCount,
        wordCount: conversion.wordCount,
        tags: conversion.tags,
        metadata: conversion.metadata,
        createdAt: conversion.createdAt
      }));
    },
    create: async ({ data }) => {
      await connectDB();
      // Create a new object without the id field
      const conversionData = { ...data };
      
      // If an ID is provided, use it as _id
      if (data.id) {
        console.log('Creating conversion with ID:', data.id);
        conversionData._id = data.id;
        delete conversionData.id;
      }
      
      console.log('Creating conversion with data:', JSON.stringify(conversionData));
      
      try {
        const conversion = await Conversion.create(conversionData);
        console.log('Conversion created successfully with ID:', conversion._id);
        
        return {
          id: conversion._id,
          userId: conversion.userId,
          filename: conversion.filename,
          originalUrl: conversion.originalUrl,
          convertedXml: conversion.convertedXml,
          status: conversion.status,
          fileSize: conversion.fileSize,
          pageCount: conversion.pageCount,
          structureType: conversion.structureType,
          processingTime: conversion.processingTime,
          detectedTables: conversion.detectedTables,
          detectedLists: conversion.detectedLists,
          detectedHeadings: conversion.detectedHeadings,
          detectedImages: conversion.detectedImages,
          characterCount: conversion.characterCount,
          wordCount: conversion.wordCount,
          tags: conversion.tags,
          metadata: conversion.metadata,
          createdAt: conversion.createdAt
        };
      } catch (error) {
        console.error('Error creating conversion:', error);
        throw error;
      }
    },
    update: async ({ where, data }) => {
      await connectDB();
      try {
        console.log('Updating conversion with where:', JSON.stringify(where));
        
        // Handle ID specifically in the where clause
        const whereClause = { ...where };
        if (where.id) {
          whereClause._id = where.id;
          delete whereClause.id;
        }
        
        console.log('Modified where clause:', JSON.stringify(whereClause));
        
        const conversion = await Conversion.findOneAndUpdate(whereClause, data, { new: true });
        
        if (!conversion) {
          console.error('Conversion not found with where clause:', JSON.stringify(whereClause));
          
          // Try to find the document to check if it exists
          const existingDoc = await Conversion.findOne(whereClause);
          console.log('Existing document check:', existingDoc ? 'Found' : 'Not found');
          
          throw new Error('Conversion not found');
        }
        
        console.log('Conversion updated successfully');
        
        return {
          id: conversion._id,
          userId: conversion.userId,
          filename: conversion.filename,
          originalUrl: conversion.originalUrl,
          convertedXml: conversion.convertedXml,
          status: conversion.status,
          fileSize: conversion.fileSize,
          pageCount: conversion.pageCount,
          structureType: conversion.structureType,
          processingTime: conversion.processingTime,
          detectedTables: conversion.detectedTables,
          detectedLists: conversion.detectedLists,
          detectedHeadings: conversion.detectedHeadings,
          detectedImages: conversion.detectedImages,
          characterCount: conversion.characterCount,
          wordCount: conversion.wordCount,
          tags: conversion.tags,
          metadata: conversion.metadata,
          createdAt: conversion.createdAt
        };
      } catch (error) {
        console.error('Error updating conversion:', error);
        throw error;
      }
    },
    count: async ({ where } = {}) => {
      await connectDB();
      return await Conversion.countDocuments(where || {});
    }
  },
  $queryRaw: async () => {
    await connectDB();
    return [{ status: 'connected' }];
  }
};

// Legacy compatibility
export const safeClient = prisma;

export { connectDB };

