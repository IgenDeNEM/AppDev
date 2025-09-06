const db = require('../config/database');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const emailService = require('./emailService');

class PackageService {
  // Get all package categories
  async getCategories() {
    try {
      const [categories] = await db.execute(
        'SELECT * FROM package_categories WHERE is_active = TRUE ORDER BY sort_order, name'
      );
      return categories;
    } catch (error) {
      console.error('Error fetching package categories:', error);
      throw error;
    }
  }

  // Get all packages with optional filtering
  async getPackages(filters = {}) {
    try {
      let query = `
        SELECT p.*, pc.name as category_name, pc.icon as category_icon
        FROM packages p
        JOIN package_categories pc ON p.category_id = pc.id
        WHERE p.is_active = TRUE
      `;
      const params = [];

      if (filters.category_id) {
        query += ' AND p.category_id = ?';
        params.push(filters.category_id);
      }

      if (filters.search) {
        query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      if (filters.requires_verification !== undefined) {
        query += ' AND p.requires_verification = ?';
        params.push(filters.requires_verification);
      }

      query += ' ORDER BY pc.sort_order, p.name';

      const [packages] = await db.execute(query, params);
      return packages;
    } catch (error) {
      console.error('Error fetching packages:', error);
      throw error;
    }
  }

  // Get package by ID
  async getPackageById(packageId) {
    try {
      const [packages] = await db.execute(
        'SELECT p.*, pc.name as category_name FROM packages p JOIN package_categories pc ON p.category_id = pc.id WHERE p.id = ?',
        [packageId]
      );
      return packages[0] || null;
    } catch (error) {
      console.error('Error fetching package:', error);
      throw error;
    }
  }

  // Create new package
  async createPackage(packageData, createdBy) {
    try {
      const {
        name,
        description,
        category_id,
        publisher,
        version,
        installer_type,
        installer_source,
        silent_flags,
        download_url,
        icon_url,
        is_system_app,
        requires_verification
      } = packageData;

      const [result] = await db.execute(
        `INSERT INTO packages (name, description, category_id, publisher, version, installer_type, 
         installer_source, silent_flags, download_url, icon_url, is_system_app, requires_verification, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [name, description, category_id, publisher, version, installer_type, installer_source,
         silent_flags, download_url, icon_url, is_system_app, requires_verification, createdBy]
      );

      return result.insertId;
    } catch (error) {
      console.error('Error creating package:', error);
      throw error;
    }
  }

  // Update package
  async updatePackage(packageId, packageData) {
    try {
      const {
        name,
        description,
        category_id,
        publisher,
        version,
        installer_type,
        installer_source,
        silent_flags,
        download_url,
        icon_url,
        is_system_app,
        requires_verification,
        is_active
      } = packageData;

      await db.execute(
        `UPDATE packages SET name = ?, description = ?, category_id = ?, publisher = ?, 
         version = ?, installer_type = ?, installer_source = ?, silent_flags = ?, 
         download_url = ?, icon_url = ?, is_system_app = ?, requires_verification = ?, 
         is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [name, description, category_id, publisher, version, installer_type, installer_source,
         silent_flags, download_url, icon_url, is_system_app, requires_verification, is_active, packageId]
      );

      return true;
    } catch (error) {
      console.error('Error updating package:', error);
      throw error;
    }
  }

  // Delete package
  async deletePackage(packageId) {
    try {
      await db.execute('UPDATE packages SET is_active = FALSE WHERE id = ?', [packageId]);
      return true;
    } catch (error) {
      console.error('Error deleting package:', error);
      throw error;
    }
  }

  // Install package
  async installPackage(packageId, userId, userEmail) {
    try {
      const package = await this.getPackageById(packageId);
      if (!package) {
        throw new Error('Package not found');
      }

      // Create install log entry
      const [logResult] = await db.execute(
        'INSERT INTO app_install_logs (user_id, package_id, action, status) VALUES (?, ?, ?, ?)',
        [userId, packageId, 'install', 'pending']
      );

      const logId = logResult.insertId;

      // Check if verification is required
      if (package.requires_verification) {
        const verificationCode = Math.floor(10000000 + Math.random() * 90000000).toString();
        
        await db.execute(
          'UPDATE app_install_logs SET verification_code = ? WHERE id = ?',
          [verificationCode, logId]
        );

        // Send verification email
        await emailService.sendVerificationCode(
          userEmail,
          verificationCode,
          'package_install',
          `Install ${package.name}`
        );

        return { requiresVerification: true, logId, message: 'Verification code sent to email' };
      }

      // Execute installation
      await this.executeInstallation(package, logId, userId);

      return { requiresVerification: false, logId, message: 'Installation started' };
    } catch (error) {
      console.error('Error installing package:', error);
      throw error;
    }
  }

  // Execute package installation
  async executeInstallation(package, logId, userId) {
    try {
      let command;
      let output = '';

      switch (package.installer_type) {
        case 'chocolatey':
          command = `choco install ${package.installer_source} ${package.silent_flags || '--yes'}`;
          break;
        case 'winget':
          command = `winget install ${package.installer_source} ${package.silent_flags || '--silent'}`;
          break;
        case 'direct_download':
          // For direct downloads, we would need to implement download logic
          throw new Error('Direct download installation not yet implemented');
        default:
          throw new Error(`Unsupported installer type: ${package.installer_type}`);
      }

      // Execute the installation command
      const { stdout, stderr } = await execAsync(command);
      output = stdout + (stderr ? '\n' + stderr : '');

      // Update log with success
      await db.execute(
        'UPDATE app_install_logs SET status = ?, installer_output = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['success', output, logId]
      );

      // Add to installed applications
      await db.execute(
        `INSERT INTO installed_applications (user_id, package_id, app_name, version, publisher, is_system_app)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, package.id, package.name, package.version, package.publisher, package.is_system_app]
      );

      return { success: true, output };
    } catch (error) {
      // Update log with failure
      await db.execute(
        'UPDATE app_install_logs SET status = ?, error_message = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['failed', error.message, logId]
      );

      throw error;
    }
  }

  // Verify and complete installation
  async verifyAndInstall(packageId, userId, verificationCode) {
    try {
      const [logs] = await db.execute(
        'SELECT * FROM app_install_logs WHERE user_id = ? AND package_id = ? AND verification_code = ? AND status = ?',
        [userId, packageId, verificationCode, 'pending']
      );

      if (logs.length === 0) {
        throw new Error('Invalid verification code or installation not found');
      }

      const log = logs[0];
      const package = await this.getPackageById(packageId);

      // Mark verification as used
      await db.execute(
        'UPDATE app_install_logs SET verification_used = TRUE WHERE id = ?',
        [log.id]
      );

      // Execute installation
      await this.executeInstallation(package, log.id, userId);

      return { success: true, message: 'Installation completed' };
    } catch (error) {
      console.error('Error verifying and installing package:', error);
      throw error;
    }
  }

  // Uninstall package
  async uninstallPackage(packageId, userId, userEmail) {
    try {
      const package = await this.getPackageById(packageId);
      if (!package) {
        throw new Error('Package not found');
      }

      // Create uninstall log entry
      const [logResult] = await db.execute(
        'INSERT INTO app_install_logs (user_id, package_id, action, status) VALUES (?, ?, ?, ?)',
        [userId, packageId, 'uninstall', 'pending']
      );

      const logId = logResult.insertId;

      // Check if verification is required for system apps
      if (package.is_system_app || package.requires_verification) {
        const verificationCode = Math.floor(10000000 + Math.random() * 90000000).toString();
        
        await db.execute(
          'UPDATE app_install_logs SET verification_code = ? WHERE id = ?',
          [verificationCode, logId]
        );

        // Send verification email
        await emailService.sendVerificationCode(
          userEmail,
          verificationCode,
          'package_uninstall',
          `Uninstall ${package.name}`
        );

        return { requiresVerification: true, logId, message: 'Verification code sent to email' };
      }

      // Execute uninstallation
      await this.executeUninstallation(package, logId, userId);

      return { requiresVerification: false, logId, message: 'Uninstallation started' };
    } catch (error) {
      console.error('Error uninstalling package:', error);
      throw error;
    }
  }

  // Execute package uninstallation
  async executeUninstallation(package, logId, userId) {
    try {
      let command;
      let output = '';

      switch (package.installer_type) {
        case 'chocolatey':
          command = `choco uninstall ${package.installer_source} ${package.silent_flags || '--yes'}`;
          break;
        case 'winget':
          command = `winget uninstall ${package.installer_source} ${package.silent_flags || '--silent'}`;
          break;
        default:
          throw new Error(`Uninstallation not supported for installer type: ${package.installer_type}`);
      }

      // Execute the uninstallation command
      const { stdout, stderr } = await execAsync(command);
      output = stdout + (stderr ? '\n' + stderr : '');

      // Update log with success
      await db.execute(
        'UPDATE app_install_logs SET status = ?, installer_output = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['success', output, logId]
      );

      // Remove from installed applications
      await db.execute(
        'DELETE FROM installed_applications WHERE user_id = ? AND package_id = ?',
        [userId, package.id]
      );

      return { success: true, output };
    } catch (error) {
      // Update log with failure
      await db.execute(
        'UPDATE app_install_logs SET status = ?, error_message = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['failed', error.message, logId]
      );

      throw error;
    }
  }

  // Get installed applications for user
  async getInstalledApplications(userId) {
    try {
      const [apps] = await db.execute(
        `SELECT ia.*, p.name as package_name, p.description as package_description
         FROM installed_applications ia
         LEFT JOIN packages p ON ia.package_id = p.id
         WHERE ia.user_id = ?
         ORDER BY ia.install_date DESC`,
        [userId]
      );
      return apps;
    } catch (error) {
      console.error('Error fetching installed applications:', error);
      throw error;
    }
  }

  // Get installation logs
  async getInstallLogs(filters = {}) {
    try {
      let query = `
        SELECT ail.*, u.username, p.name as package_name, pc.name as category_name
        FROM app_install_logs ail
        JOIN users u ON ail.user_id = u.id
        JOIN packages p ON ail.package_id = p.id
        JOIN package_categories pc ON p.category_id = pc.id
        WHERE 1=1
      `;
      const params = [];

      if (filters.user_id) {
        query += ' AND ail.user_id = ?';
        params.push(filters.user_id);
      }

      if (filters.status) {
        query += ' AND ail.status = ?';
        params.push(filters.status);
      }

      if (filters.action) {
        query += ' AND ail.action = ?';
        params.push(filters.action);
      }

      if (filters.date_from) {
        query += ' AND ail.created_at >= ?';
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        query += ' AND ail.created_at <= ?';
        params.push(filters.date_to);
      }

      query += ' ORDER BY ail.created_at DESC';

      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      }

      const [logs] = await db.execute(query, params);
      return logs;
    } catch (error) {
      console.error('Error fetching install logs:', error);
      throw error;
    }
  }

  // Get system applications (for uninstall tab)
  async getSystemApplications() {
    try {
      // This would typically query the Windows registry or WMI
      // For now, we'll return a mock list of common system applications
      const systemApps = [
        { name: 'Microsoft Edge', version: 'Latest', publisher: 'Microsoft Corporation', is_system: true },
        { name: 'Windows Media Player', version: '12.0', publisher: 'Microsoft Corporation', is_system: true },
        { name: 'Internet Explorer', version: '11.0', publisher: 'Microsoft Corporation', is_system: true },
        { name: 'Windows Defender', version: 'Latest', publisher: 'Microsoft Corporation', is_system: true },
        { name: 'Windows Update', version: 'Latest', publisher: 'Microsoft Corporation', is_system: true }
      ];

      return systemApps;
    } catch (error) {
      console.error('Error fetching system applications:', error);
      throw error;
    }
  }
}

module.exports = new PackageService();