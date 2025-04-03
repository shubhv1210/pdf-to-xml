# PDF to XML Converter

A powerful web application built with Next.js that converts PDF documents to structured XML with intelligent structure detection and document management features.

## Application Overview

The PDF to XML Converter is a sophisticated web application developed to transform PDF documents into structured XML format while preserving the original document structure and layout. The application offers multiple conversion options, real-time processing, and a comprehensive dashboard for managing your conversion history.

## Live Application

The application is live and can be accessed at: [PDF to XML Converter](https://pdf-to-xml-converter-lilac.vercel.app/)

## Core Features

- **Smart PDF Parsing**: Accurately extracts text with position, formatting, and structural information
- **Customizable Output Formats**: 
  - **Basic**: Simple text extraction with position data
  - **Enhanced**: Smart paragraph and heading detection with basic formatting
  - **Full**: Complete structure detection including tables, lists, and images
- **Real-time Conversion**: Status updates and progress indicators during processing
- **Advanced XML Search**: Text search with highlighting in XML output
- **Document Management**: Filter, sort, and manage your conversion history
- **Responsive Design**: Works flawlessly on desktop, tablet, and mobile devices
- **Dark Mode Support**: Eye-friendly interface with automatic theme detection

## Technical Details

### Frontend

- **Next.js**: React framework with server-side rendering
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **TypeScript**: Static typing for improved code quality

### Backend

- **Next.js API Routes**: Serverless functions for backend operations
- **MongoDB**: NoSQL database for storing user data and conversion history
- **NextAuth.js**: Authentication system for user management

### PDF Processing

- **PDF.js**: Mozilla's PDF rendering and parsing library
- **Custom Structure Analysis**: Proprietary algorithms for document structure detection
- **Optimized XML Generation**: Efficient XML creation with structure preservation

## Development Setup

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- MongoDB database

### Installation

1. **Set up the project**
   ```bash
   # Create project folder
   mkdir pdf-to-xml-converter
   cd pdf-to-xml-converter
   
   # Initialize project
   npm init -y
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env.local` file in the root directory with:
   ```
   MONGODB_URI="your-mongodb-connection-string"
   NEXTAUTH_SECRET="your-secure-random-string"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   Open [http://localhost:3000](http://localhost:3000) in your browser

## Deployment

The application is deployed on Vercel and is live at [https://pdf-to-xml-converter-lilac.vercel.app/](https://pdf-to-xml-converter-lilac.vercel.app/), providing excellent performance and scalability.

### Deployment Options

- **Vercel**: One-click deployment with GitHub integration
- **Docker**: Containerized deployment for custom hosting
- **AWS/Azure/GCP**: Cloud platform deployment for enterprise needs

## Custom XML Output Examples

### Basic Structure
```xml
<document>
  <page number="1">
    <text x="100" y="120" font="Arial" size="12">Sample text content</text>
    <!-- Additional text elements with position data -->
  </page>
</document>
```

### Enhanced Structure
```xml
<document>
  <page number="1">
    <heading level="1">Document Title</heading>
    <paragraph>
      <text>First paragraph content with </text>
      <text style="bold">emphasized text</text>
      <text> and regular text.</text>
    </paragraph>
  </page>
</document>
```

### Full Structure
```xml
<document title="Sample Document">
  <metadata>
    <author>John Doe</author>
    <created>2023-07-15</created>
  </metadata>
  <page number="1">
    <heading level="1">Document Title</heading>
    <paragraph>Introductory paragraph...</paragraph>
    <table>
      <tr><th>Header 1</th><th>Header 2</th></tr>
      <tr><td>Data 1</td><td>Data 2</td></tr>
    </table>
    <list type="bullet">
      <item>First item</item>
      <item>Second item</item>
    </list>
    <image src="data:image/png;base64,..." x="150" y="300" width="200" height="150" />
  </page>
</document>
```

## Support and Feedback

For support or feedback, please contact the development team through the application's contact form or by email at support@pdf-to-xml.com.

## About the Project

This application was developed to address the growing need for converting PDF documents to structured XML format in various industries, including publishing, legal, medical, and academic fields. Our goal is to provide a tool that maintains the highest fidelity to the original document while offering flexible output options.

Created by Shubh Varshney
