/**
 * Main Router for Yamo API
 * 
 * This router handles the root path of the API, providing:
 * - Basic information about the API
 * - Entry point for API navigation
 * - Informative welcome page for users accessing the API root
 * 
 * While most API endpoints return JSON data, this endpoint renders
 * an HTML page as a developer-friendly landing page.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const packageInfo = require('../../package.json');

/**
 * GET /
 * Renders the API home page with basic information
 * 
 * @permission Public endpoint - no authentication required
 * @returns {HTML} Rendered index page with API information
 * 
 * This endpoint serves as a welcome page for the API,
 * showing basic information about the application and potentially
 * providing links to documentation or other resources.
 */
router.get('/', function (req, res, next) {
  try {
    // Read the HTML template from file
    const templatePath = path.join(__dirname, '../views/welcome.html');
    let htmlTemplate = fs.readFileSync(templatePath, 'utf8');

    // Replace variables in the template
    const replacements = {
      '{{apiVersion}}': packageInfo.version || '1.0.0',
      '{{currentYear}}': new Date().getFullYear(),
      '{{environment}}': process.env.NODE_ENV || 'development'
    };

    // Apply all replacements
    Object.entries(replacements).forEach(([placeholder, value]) => {
      htmlTemplate = htmlTemplate.replace(new RegExp(placeholder, 'g'), value);
    });

    // Serve the CSS file statically
    // This assumes we've set up express.static middleware for the public directory

    // Send the HTML response
    res.send(htmlTemplate);
  } catch (err) {
    console.error('Error rendering welcome page:', err);
    res.status(500).send('Error loading welcome page');
  }
});

module.exports = router;
