#!/usr/bin/env node

// Health Check Script for WhatsApp Introduction Validator Bot
// Monitors bot status and sends alerts if issues detected

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const winston = require('winston');

// Configure logger for health checks
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/health-check.log' }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

class HealthChecker {
    constructor() {
        this.botName = 'whatsapp-intro-bot';
        this.alertThresholds = {
            inactiveHours: 24,      // Alert if no activity for 24 hours
            memoryLimitMB: 1024,    // Alert if memory usage > 1GB
            restartCount: 5         // Alert if restarted more than 5 times
        };
    }

    async checkPM2Status() {
        return new Promise((resolve, reject) => {
            exec('pm2 jlist', (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(`PM2 command failed: ${error.message}`));
                    return;
                }

                try {
                    const processes = JSON.parse(stdout);
                    const botProcess = processes.find(p => p.name === this.botName);
                    
                    if (!botProcess) {
                        reject(new Error(`Bot process '${this.botName}' not found`));
                        return;
                    }

                    resolve(botProcess);
                } catch (parseError) {
                    reject(new Error(`Failed to parse PM2 output: ${parseError.message}`));
                }
            });
        });
    }

    async checkLogActivity() {
        const logFile = path.join(__dirname, '../logs/combined.log');
        
        if (!fs.existsSync(logFile)) {
            throw new Error('Log file not found');
        }

        const stats = fs.statSync(logFile);
        const lastModified = stats.mtime;
        const hoursSinceLastActivity = (Date.now() - lastModified.getTime()) / (1000 * 60 * 60);

        return {
            lastActivity: lastModified,
            hoursSinceLastActivity,
            isStale: hoursSinceLastActivity > this.alertThresholds.inactiveHours
        };
    }

    async checkDiskSpace() {
        return new Promise((resolve, reject) => {
            exec('df -h .', (error, stdout, stderr) => {
                if (error) {
                    reject(new Error(`Disk space check failed: ${error.message}`));
                    return;
                }

                const lines = stdout.split('\n');
                const dataLine = lines[1];
                const parts = dataLine.split(/\s+/);
                const usagePercent = parseInt(parts[4].replace('%', ''));

                resolve({
                    usage: usagePercent,
                    available: parts[3],
                    isLow: usagePercent > 90
                });
            });
        });
    }

    async checkSessionFile() {
        const sessionDir = path.join(__dirname, '../.wwebjs_auth');
        
        if (!fs.existsSync(sessionDir)) {
            return {
                exists: false,
                message: 'WhatsApp session directory not found - authentication required'
            };
        }

        const sessionFiles = fs.readdirSync(sessionDir);
        
        return {
            exists: true,
            fileCount: sessionFiles.length,
            message: sessionFiles.length > 0 ? 'Session files present' : 'Session directory empty'
        };
    }

    async sendAlert(message, severity = 'warning') {
        logger.error(`ALERT [${severity.toUpperCase()}]: ${message}`);
        
        // Here you can add additional alert mechanisms:
        // - Email notifications
        // - Slack/Discord webhooks
        // - SMS alerts
        // - Push notifications
        
        console.log(`🚨 ALERT: ${message}`);
    }

    async runHealthCheck() {
        logger.info('Starting health check...');
        
        const results = {
            timestamp: new Date().toISOString(),
            status: 'healthy',
            checks: {},
            alerts: []
        };

        try {
            // Check PM2 process status
            logger.info('Checking PM2 process status...');
            const pm2Status = await this.checkPM2Status();
            
            results.checks.pm2 = {
                status: pm2Status.pm2_env.status,
                pid: pm2Status.pid,
                uptime: pm2Status.pm2_env.pm_uptime,
                restarts: pm2Status.pm2_env.restart_time,
                memory: Math.round(pm2Status.monit.memory / 1024 / 1024), // MB
                cpu: pm2Status.monit.cpu
            };

            // Check for issues
            if (pm2Status.pm2_env.status !== 'online') {
                results.alerts.push('Bot process is not running');
                results.status = 'critical';
                await this.sendAlert(`Bot process is ${pm2Status.pm2_env.status}`, 'critical');
            }

            if (pm2Status.pm2_env.restart_time > this.alertThresholds.restartCount) {
                results.alerts.push(`High restart count: ${pm2Status.pm2_env.restart_time}`);
                results.status = 'warning';
                await this.sendAlert(`Bot has restarted ${pm2Status.pm2_env.restart_time} times`, 'warning');
            }

            if (results.checks.pm2.memory > this.alertThresholds.memoryLimitMB) {
                results.alerts.push(`High memory usage: ${results.checks.pm2.memory}MB`);
                results.status = 'warning';
                await this.sendAlert(`High memory usage: ${results.checks.pm2.memory}MB`, 'warning');
            }

        } catch (error) {
            results.checks.pm2 = { error: error.message };
            results.alerts.push(`PM2 check failed: ${error.message}`);
            results.status = 'critical';
            await this.sendAlert(`PM2 check failed: ${error.message}`, 'critical');
        }

        try {
            // Check log activity
            logger.info('Checking log activity...');
            const logActivity = await this.checkLogActivity();
            
            results.checks.logActivity = logActivity;

            if (logActivity.isStale) {
                results.alerts.push(`No activity for ${Math.round(logActivity.hoursSinceLastActivity)} hours`);
                results.status = 'warning';
                await this.sendAlert(`Bot inactive for ${Math.round(logActivity.hoursSinceLastActivity)} hours`, 'warning');
            }

        } catch (error) {
            results.checks.logActivity = { error: error.message };
            results.alerts.push(`Log activity check failed: ${error.message}`);
        }

        try {
            // Check disk space
            logger.info('Checking disk space...');
            const diskSpace = await this.checkDiskSpace();
            
            results.checks.diskSpace = diskSpace;

            if (diskSpace.isLow) {
                results.alerts.push(`Low disk space: ${diskSpace.usage}%`);
                results.status = 'warning';
                await this.sendAlert(`Low disk space: ${diskSpace.usage}%`, 'warning');
            }

        } catch (error) {
            results.checks.diskSpace = { error: error.message };
            results.alerts.push(`Disk space check failed: ${error.message}`);
        }

        try {
            // Check WhatsApp session
            logger.info('Checking WhatsApp session...');
            const sessionStatus = await this.checkSessionFile();
            
            results.checks.session = sessionStatus;

            if (!sessionStatus.exists) {
                results.alerts.push('WhatsApp session not found - authentication required');
                results.status = 'critical';
                await this.sendAlert('WhatsApp session not found - authentication required', 'critical');
            }

        } catch (error) {
            results.checks.session = { error: error.message };
            results.alerts.push(`Session check failed: ${error.message}`);
        }

        // Log results
        logger.info(`Health check completed. Status: ${results.status}`);
        if (results.alerts.length > 0) {
            logger.warn(`Alerts: ${results.alerts.join(', ')}`);
        }

        // Save results to file
        const resultsFile = path.join(__dirname, '../logs/health-check-results.json');
        fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));

        return results;
    }
}

// Run health check if called directly
if (require.main === module) {
    const checker = new HealthChecker();
    
    checker.runHealthCheck()
        .then(results => {
            console.log('\n📊 Health Check Results:');
            console.log(`Status: ${results.status.toUpperCase()}`);
            console.log(`Alerts: ${results.alerts.length}`);
            
            if (results.alerts.length > 0) {
                console.log('\n🚨 Alerts:');
                results.alerts.forEach(alert => console.log(`  - ${alert}`));
            }
            
            console.log('\n📈 System Status:');
            if (results.checks.pm2) {
                console.log(`  PM2: ${results.checks.pm2.status || 'Error'}`);
                if (results.checks.pm2.memory) {
                    console.log(`  Memory: ${results.checks.pm2.memory}MB`);
                }
            }
            
            if (results.checks.diskSpace) {
                console.log(`  Disk: ${results.checks.diskSpace.usage || 'Unknown'}% used`);
            }
            
            process.exit(results.status === 'critical' ? 1 : 0);
        })
        .catch(error => {
            console.error('Health check failed:', error.message);
            process.exit(1);
        });
}

module.exports = HealthChecker;
