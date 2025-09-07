const db = require('../config/database');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const emailService = require('./emailService');

class TweakService {
  // Get all tweak categories
  async getCategories() {
    try {
      const [categories] = await db.execute(
        'SELECT * FROM tweak_categories WHERE is_active = TRUE ORDER BY sort_order, name'
      );
      return categories;
    } catch (error) {
      console.error('Error fetching tweak categories:', error);
      throw error;
    }
  }

  // Get all tweaks with optional filtering
  async getTweaks(filters = {}) {
    try {
      let query = `
        SELECT t.*, tc.name as category_name, tc.icon as category_icon
        FROM tweaks t
        JOIN tweak_categories tc ON t.category_id = tc.id
        WHERE t.is_active = TRUE
      `;
      const params = [];

      if (filters.category_id) {
        query += ' AND t.category_id = ?';
        params.push(filters.category_id);
      }

      if (filters.search) {
        query += ' AND (t.name LIKE ? OR t.description LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      if (filters.is_dangerous !== undefined) {
        query += ' AND t.is_dangerous = ?';
        params.push(filters.is_dangerous);
      }

      if (filters.requires_verification !== undefined) {
        query += ' AND t.requires_verification = ?';
        params.push(filters.requires_verification);
      }

      query += ' ORDER BY tc.sort_order, t.name';

      const [tweaks] = await db.execute(query, params);
      return tweaks;
    } catch (error) {
      console.error('Error fetching tweaks:', error);
      throw error;
    }
  }

  // Get tweak by ID
  async getTweakById(tweakId) {
    try {
      const [tweaks] = await db.execute(
        'SELECT t.*, tc.name as category_name FROM tweaks t JOIN tweak_categories tc ON t.category_id = tc.id WHERE t.id = ?',
        [tweakId]
      );
      return tweaks[0] || null;
    } catch (error) {
      console.error('Error fetching tweak:', error);
      throw error;
    }
  }

  // Create new tweak
  async createTweak(tweakData, createdBy) {
    try {
      const {
        name,
        description,
        category_id,
        command,
        is_dangerous,
        requires_verification
      } = tweakData;

      const [result] = await db.execute(
        `INSERT INTO tweaks (name, description, category_id, command, is_dangerous, requires_verification, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, description, category_id, command, is_dangerous, requires_verification, createdBy]
      );

      return result.insertId;
    } catch (error) {
      console.error('Error creating tweak:', error);
      throw error;
    }
  }

  // Update tweak
  async updateTweak(tweakId, tweakData) {
    try {
      const {
        name,
        description,
        category_id,
        command,
        is_dangerous,
        requires_verification,
        is_active
      } = tweakData;

      await db.execute(
        `UPDATE tweaks SET name = ?, description = ?, category_id = ?, command = ?, 
         is_dangerous = ?, requires_verification = ?, is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [name, description, category_id, command, is_dangerous, requires_verification, is_active, tweakId]
      );

      return true;
    } catch (error) {
      console.error('Error updating tweak:', error);
      throw error;
    }
  }

  // Delete tweak
  async deleteTweak(tweakId) {
    try {
      await db.execute('UPDATE tweaks SET is_active = FALSE WHERE id = ?', [tweakId]);
      return true;
    } catch (error) {
      console.error('Error deleting tweak:', error);
      throw error;
    }
  }

  // Execute tweak
  async executeTweak(tweakId, userId, userEmail) {
    try {
      const tweak = await this.getTweakById(tweakId);
      if (!tweak) {
        throw new Error('Tweak not found');
      }

      // Create execution log entry
      const [logResult] = await db.execute(
        'INSERT INTO tweak_execution_logs (user_id, tweak_id, status) VALUES (?, ?, ?)',
        [userId, tweakId, 'pending']
      );

      const logId = logResult.insertId;

      // Check if verification is required
      if (tweak.requires_verification || tweak.is_dangerous) {
        const verificationCode = Math.floor(10000000 + Math.random() * 90000000).toString();
        
        await db.execute(
          'UPDATE tweak_execution_logs SET verification_code = ? WHERE id = ?',
          [verificationCode, logId]
        );

        // Send verification email
        await emailService.sendVerificationCode(
          userEmail,
          verificationCode,
          'tweak_execution',
          `Execute ${tweak.name}`
        );

        return { requiresVerification: true, logId, message: 'Verification code sent to email' };
      }

      // Execute tweak
      await this.executeTweakCommand(tweak, logId, userId);

      return { requiresVerification: false, logId, message: 'Tweak executed successfully' };
    } catch (error) {
      console.error('Error executing tweak:', error);
      throw error;
    }
  }

  // Execute tweak command
  async executeTweakCommand(tweak, logId, userId) {
    try {
      let output = '';

      // Execute the tweak command
      const { stdout, stderr } = await execAsync(tweak.command);
      output = stdout + (stderr ? '\n' + stderr : '');

      // Update log with success
      await db.execute(
        'UPDATE tweak_execution_logs SET status = ?, command_output = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['success', output, logId]
      );

      return { success: true, output };
    } catch (error) {
      // Update log with failure
      await db.execute(
        'UPDATE tweak_execution_logs SET status = ?, error_message = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['failed', error.message, logId]
      );

      throw error;
    }
  }

  // Verify and execute tweak
  async verifyAndExecute(tweakId, userId, verificationCode) {
    try {
      const [logs] = await db.execute(
        'SELECT * FROM tweak_execution_logs WHERE user_id = ? AND tweak_id = ? AND verification_code = ? AND status = ?',
        [userId, tweakId, verificationCode, 'pending']
      );

      if (logs.length === 0) {
        throw new Error('Invalid verification code or tweak execution not found');
      }

      const log = logs[0];
      const tweak = await this.getTweakById(tweakId);

      // Mark verification as used
      await db.execute(
        'UPDATE tweak_execution_logs SET verification_used = TRUE WHERE id = ?',
        [log.id]
      );

      // Execute tweak
      await this.executeTweakCommand(tweak, log.id, userId);

      return { success: true, message: 'Tweak executed successfully' };
    } catch (error) {
      console.error('Error verifying and executing tweak:', error);
      throw error;
    }
  }

  // Get execution logs
  async getExecutionLogs(filters = {}) {
    try {
      let query = `
        SELECT tel.*, u.username, t.name as tweak_name, tc.name as category_name
        FROM tweak_execution_logs tel
        JOIN users u ON tel.user_id = u.id
        JOIN tweaks t ON tel.tweak_id = t.id
        JOIN tweak_categories tc ON t.category_id = tc.id
        WHERE 1=1
      `;
      const params = [];

      if (filters.user_id) {
        query += ' AND tel.user_id = ?';
        params.push(filters.user_id);
      }

      if (filters.status) {
        query += ' AND tel.status = ?';
        params.push(filters.status);
      }

      if (filters.date_from) {
        query += ' AND tel.created_at >= ?';
        params.push(filters.date_from);
      }

      if (filters.date_to) {
        query += ' AND tel.created_at <= ?';
        params.push(filters.date_to);
      }

      query += ' ORDER BY tel.created_at DESC';

      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      }

      const [logs] = await db.execute(query, params);
      return logs;
    } catch (error) {
      console.error('Error fetching execution logs:', error);
      throw error;
    }
  }

  // Get clipboard history (last 10 copies)
  async getClipboardHistory(userId) {
    try {
      // This would typically interface with the Windows clipboard API
      // For now, we'll return a mock implementation
      const clipboardHistory = [
        { id: 1, content: 'Sample text 1', timestamp: new Date(), type: 'text' },
        { id: 2, content: 'Sample text 2', timestamp: new Date(), type: 'text' },
        { id: 3, content: 'https://example.com', timestamp: new Date(), type: 'url' }
      ];

      return clipboardHistory;
    } catch (error) {
      console.error('Error fetching clipboard history:', error);
      throw error;
    }
  }

  // Execute system cleanup
  async executeSystemCleanup(userId) {
    try {
      const cleanupCommands = [
        'powershell -Command "Clear-RecycleBin -Force"',
        'powershell -Command "Get-ChildItem -Path $env:TEMP -Recurse | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue"',
        'powershell -Command "Get-ChildItem -Path C:\\Windows\\Prefetch -Recurse | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue"',
        'powershell -Command "Get-ChildItem -Path C:\\Windows\\Logs -Recurse | Remove-Item -Force -Recurse -ErrorAction SilentlyContinue"'
      ];

      let totalOutput = '';
      let successCount = 0;

      for (const command of cleanupCommands) {
        try {
          const { stdout, stderr } = await execAsync(command);
          totalOutput += `Command: ${command}\nOutput: ${stdout}\n${stderr ? 'Errors: ' + stderr : ''}\n\n`;
          successCount++;
        } catch (error) {
          totalOutput += `Command: ${command}\nError: ${error.message}\n\n`;
        }
      }

      return {
        success: true,
        output: totalOutput,
        commandsExecuted: successCount,
        totalCommands: cleanupCommands.length
      };
    } catch (error) {
      console.error('Error executing system cleanup:', error);
      throw error;
    }
  }

  // Get Windows services (for services manager)
  async getWindowsServices() {
    try {
      // This would typically query Windows services via WMI or PowerShell
      // For now, we'll return a mock list of common services
      const services = [
        { name: 'Windows Update', displayName: 'Windows Update', status: 'Running', startupType: 'Automatic', description: 'Enables the detection, download, and installation of updates for Windows and other programs.' },
        { name: 'Windows Defender', displayName: 'Windows Defender Antivirus Service', status: 'Running', startupType: 'Automatic', description: 'Provides real-time protection against malware and other potentially unwanted software.' },
        { name: 'Windows Search', displayName: 'Windows Search', status: 'Running', startupType: 'Automatic', description: 'Provides content indexing and property caching for file, email, and other content.' },
        { name: 'Superfetch', displayName: 'SysMain', status: 'Running', startupType: 'Automatic', description: 'Maintains and improves system performance over time.' },
        { name: 'Windows Error Reporting', displayName: 'Windows Error Reporting Service', status: 'Running', startupType: 'Automatic', description: 'Allows error reporting for services and applications running in non-standard environments.' }
      ];

      return services;
    } catch (error) {
      console.error('Error fetching Windows services:', error);
      throw error;
    }
  }

  // Toggle Windows service
  async toggleWindowsService(serviceName, action) {
    try {
      let command;
      
      switch (action) {
        case 'start':
          command = `sc start "${serviceName}"`;
          break;
        case 'stop':
          command = `sc stop "${serviceName}"`;
          break;
        case 'disable':
          command = `sc config "${serviceName}" start= disabled`;
          break;
        case 'enable':
          command = `sc config "${serviceName}" start= auto`;
          break;
        default:
          throw new Error(`Invalid action: ${action}`);
      }

      const { stdout, stderr } = await execAsync(command);
      const output = stdout + (stderr ? '\n' + stderr : '');

      return { success: true, output };
    } catch (error) {
      console.error('Error toggling Windows service:', error);
      throw error;
    }
  }
}

module.exports = new TweakService();