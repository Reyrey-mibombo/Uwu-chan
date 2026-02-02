const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, PermissionsBitField } = require('discord.js');
require('dotenv').config();

// Configuration
const ROLE_NAME = "Pic Perms";
const STATUS_TRIGGER = "/Asclade";
const CHECK_INTERVAL = 10000; // 10 seconds in milliseconds
const TOKEN = process.env.DISCORD_TOKEN;

// Bot setup with all required intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Store role cache for speed
const roleCache = new Map();
let statusCheckLoop;
let reminderLoop;

// ================= BOT READY =================
client.once('ready', async () => {
    console.log("=".repeat(50));
    console.log(`✅ ${client.user.tag} is ONLINE!`);
    console.log(`🔍 Checking every: ${CHECK_INTERVAL/1000} seconds`);
    console.log(`🎯 Looking for: '${STATUS_TRIGGER}' in status`);
    console.log(`👑 Giving role: '${ROLE_NAME}'`);
    console.log(`💬 Command prefix: '$'`);
    console.log("=".repeat(50));
    
    // Set bot status
    client.user.setActivity({
        name: `for ${STATUS_TRIGGER} | $help`,
        type: ActivityType.Watching
    });
    
    // Start background loops
    startLoops();
    
    console.log(`✅ Bot is now monitoring ${client.guilds.cache.size} servers`);
});

// ================= COMMANDS HANDLER =================
client.on('messageCreate', async (message) => {
    // Ignore bot messages and non-prefix messages
    if (message.author.bot || !message.content.startsWith('$')) return;
    
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    // ================= $help COMMAND =================
    if (command === 'help' || command === 'h' || command === 'commands') {
        const embed = new EmbedBuilder()
            .setTitle('🤖 Pic Perms Bot - Commands')
            .setDescription(`**Prefix:** \`$\`\nPut \`${STATUS_TRIGGER}\` in your status to get \`${ROLE_NAME}\` role!`)
            .setColor(0x0099FF);
        
        const commandsList = [
            ['`$help`', 'Show this help menu'],
            ['`$checkme`', 'Check if you\'ll get the Pic Perms role'],
            ['`$check @user`', 'Check another user\'s status'],
            ['`$stats`', 'Show server statistics'],
            ['`$ping`', 'Check bot latency'],
            ['`$refresh`', 'Force check all members now (Admin)'],
            ['`$roleinfo`', 'Show info about Pic Perms role'],
            ['`$guide`', 'Step-by-step guide to get role']
        ];
        
        commandsList.forEach(([cmd, desc]) => {
            embed.addFields({ name: cmd, value: desc, inline: false });
        });
        
        embed.addFields({
            name: '⚡ How it works:',
            value: `1. Put \`${STATUS_TRIGGER}\` in your Discord status\n2. Bot checks every **${CHECK_INTERVAL/1000} seconds**\n3. Get \`${ROLE_NAME}\` role automatically!\n4. Remove status = lose role in ${CHECK_INTERVAL/1000}s`,
            inline: false
        });
        
        embed.setFooter({ text: `Bot checking every ${CHECK_INTERVAL/1000} seconds` });
        
        await message.reply({ embeds: [embed] });
    }
    
    // ================= $checkme COMMAND =================
    else if (command === 'checkme' || command === 'mystatus' || command === 'status') {
        const member = message.member;
        const hasTrigger = hasTriggerInStatus(member);
        const picRole = await getOrCreateRole(message.guild);
        const hasRole = picRole ? member.roles.cache.has(picRole.id) : false;
        
        const color = hasTrigger ? 0x00FF00 : 0xFF0000;
        const embed = new EmbedBuilder()
            .setTitle(`🔍 Status Check for ${member.user.username}`)
            .setColor(color);
        
        const statusEmoji = hasTrigger ? '✅' : '❌';
        embed.addFields({ 
            name: `${statusEmoji} Trigger Check`, 
            value: `\`${STATUS_TRIGGER}\` in status: **${hasTrigger ? 'YES' : 'NO'}**`, 
            inline: false 
        });
        
        const roleEmoji = hasRole ? '✅' : '❌';
        embed.addFields({ 
            name: `${roleEmoji} Role Status`, 
            value: `\`${ROLE_NAME}\` role: **${hasRole ? 'YES' : 'NO'}**`, 
            inline: false 
        });
        
        if (!hasTrigger) {
            embed.addFields({
                name: '🚀 How to get role:',
                value: `1. Click your profile picture\n2. Select 'Set Custom Status'\n3. Type: \`${STATUS_TRIGGER}\`\n4. Click 'Save'\n⏱️ Role will appear in **${CHECK_INTERVAL/1000} seconds**`,
                inline: false
            });
        } else if (hasTrigger && !hasRole) {
            embed.addFields({
                name: '⏳ Almost there!',
                value: `✅ You have \`${STATUS_TRIGGER}\` in your status!\n⏱️ Role should appear in **${CHECK_INTERVAL/1000} seconds**`,
                inline: false
            });
        } else {
            embed.addFields({
                name: '🎉 Perfect!',
                value: `✅ You have both the status and role!\nIf you remove \`${STATUS_TRIGGER}\`, you'll lose the role in **${CHECK_INTERVAL/1000} seconds**`,
                inline: false
            });
        }
        
        await message.reply({ embeds: [embed] });
    }
    
    // ================= $check COMMAND =================
    else if (command === 'check') {
        if (!args[0]) {
            await message.reply('❌ Please tag a user! Example: `$check @username`');
            return;
        }
        
        const member = message.mentions.members.first();
        if (!member) {
            await message.reply('❌ User not found! Please tag a valid user.');
            return;
        }
        
        if (member.user.bot) {
            await message.reply('❌ Bots don\'t get roles!');
            return;
        }
        
        const hasTrigger = hasTriggerInStatus(member);
        const picRole = await getOrCreateRole(message.guild);
        const hasRole = picRole ? member.roles.cache.has(picRole.id) : false;
        
        await message.reply(
            `**${member.user.username}'s Status:**\n` +
            `• \`${STATUS_TRIGGER}\` in status: **${hasTrigger ? '✅ YES' : '❌ NO'}**\n` +
            `• \`${ROLE_NAME}\` role: **${hasRole ? '✅ YES' : '❌ NO'}**`
        );
    }
    
    // ================= $stats COMMAND =================
    else if (command === 'stats' || command === 'statistics' || command === 'info') {
        const picRole = await getOrCreateRole(message.guild);
        
        if (!picRole) {
            await message.reply(`❌ \`${ROLE_NAME}\` role not found!`);
            return;
        }
        
        const membersWithRole = picRole.members.size;
        const totalMembers = message.guild.members.cache.filter(m => !m.user.bot).size;
        const percentage = totalMembers > 0 ? (membersWithRole / totalMembers) * 100 : 0;
        
        const embed = new EmbedBuilder()
            .setTitle('📊 Server Statistics')
            .setColor(0x0099FF)
            .setTimestamp();
        
        embed.addFields(
            { name: 'Role Name', value: `\`${ROLE_NAME}\``, inline: true },
            { name: 'Trigger Text', value: `\`${STATUS_TRIGGER}\``, inline: true },
            { name: 'Check Interval', value: `\`${CHECK_INTERVAL/1000}s\``, inline: true },
            { name: 'Members With Role', value: `\`${membersWithRole}\``, inline: true },
            { name: 'Total Members', value: `\`${totalMembers}\``, inline: true },
            { name: 'Percentage', value: `\`${percentage.toFixed(1)}%\``, inline: true }
        );
        
        embed.setFooter({ text: 'Real-time updates every 10 seconds' });
        
        await message.reply({ embeds: [embed] });
    }
    
    // ================= $ping COMMAND =================
    else if (command === 'ping') {
        const latency = Date.now() - message.createdTimestamp;
        const wsPing = client.ws.ping;
        
        const embed = new EmbedBuilder()
            .setTitle('🏓 Pong!')
            .setDescription(`**Message Latency:** \`${latency}ms\`\n**WebSocket Ping:** \`${wsPing}ms\`\n**Check Interval:** \`${CHECK_INTERVAL/1000} seconds\``)
            .setColor(0x00FF00);
        
        let status = '✅ Excellent';
        if (wsPing > 200) status = '❌ Slow';
        else if (wsPing > 100) status = '⚠️ Good';
        
        embed.addFields({ name: 'Connection Status', value: status, inline: true });
        
        await message.reply({ embeds: [embed] });
    }
    
    // ================= $refresh COMMAND =================
    else if (command === 'refresh' || command === 'force' || command === 'checkall') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            await message.reply('❌ You need Manage Roles permission to use this command!');
            return;
        }
        
        const msg = await message.reply('🔄 Force checking all members...');
        
        const picRole = await getOrCreateRole(message.guild);
        if (!picRole) {
            await msg.edit('❌ Failed to get/create role!');
            return;
        }
        
        let updated = 0;
        let total = 0;
        
        for (const member of message.guild.members.cache.values()) {
            if (member.user.bot) continue;
            
            total++;
            const hasTrigger = hasTriggerInStatus(member);
            const hasRole = member.roles.cache.has(picRole.id);
            
            try {
                if (hasTrigger && !hasRole) {
                    await member.roles.add(picRole);
                    updated++;
                } else if (!hasTrigger && hasRole) {
                    await member.roles.remove(picRole);
                    updated++;
                }
            } catch (error) {
                // Silently handle errors
            }
        }
        
        await msg.edit(
            `✅ **Force refresh complete!**\n` +
            `• Checked: \`${total}\` members\n` +
            `• Updated: \`${updated}\` roles\n` +
            `• Next auto-check: in **${CHECK_INTERVAL/1000} seconds**`
        );
    }
    
    // ================= $roleinfo COMMAND =================
    else if (command === 'roleinfo' || command === 'role' || command === 'aboutrole') {
        const picRole = await getOrCreateRole(message.guild);
        
        if (!picRole) {
            await message.reply(`❌ \`${ROLE_NAME}\` role not found!`);
            return;
        }
        
        const embed = new EmbedBuilder()
            .setTitle(`👑 ${picRole.name} Role Information`)
            .setColor(picRole.color);
        
        const createdTimestamp = Math.floor(picRole.createdTimestamp / 1000);
        
        embed.addFields(
            { name: 'Role ID', value: `\`${picRole.id}\``, inline: true },
            { name: 'Color', value: `\`${picRole.hexColor}\``, inline: true },
            { name: 'Created', value: `<t:${createdTimestamp}:R>`, inline: true },
            { name: 'Position', value: `\`${picRole.position}\``, inline: true },
            { name: 'Hoisted', value: `\`${picRole.hoist}\``, inline: true },
            { name: 'Mentionable', value: `\`${picRole.mentionable}\``, inline: true }
        );
        
        const membersWith = picRole.members.size;
        const totalMembers = message.guild.members.cache.filter(m => !m.user.bot).size;
        
        embed.addFields({ 
            name: 'Members', 
            value: `\`${membersWith}/${totalMembers}\` (${totalMembers > 0 ? ((membersWith/totalMembers)*100).toFixed(1) : 0}%)`, 
            inline: true 
        });
        
        embed.addFields({
            name: '🎯 How to get this role:',
            value: `Simply put \`${STATUS_TRIGGER}\` in your Discord status!\nThe bot checks every **${CHECK_INTERVAL/1000} seconds** and gives/removes it automatically.`,
            inline: false
        });
        
        embed.setFooter({ text: 'Automatic role management system' });
        
        await message.reply({ embeds: [embed] });
    }
    
    // ================= $guide COMMAND =================
    else if (command === 'guide' || command === 'tutorial' || command === 'howto') {
        const embed = new EmbedBuilder()
            .setTitle('📖 Complete Guide to Get Pic Perms')
            .setDescription('Follow these steps to get the role:')
            .setColor(0xFFD700);
        
        const steps = [
            ['1️⃣ **Set Your Status**', 
             '• Click your profile picture in Discord\n' +
             '• Select **"Set Custom Status"**\n' +
             `• Type: \`${STATUS_TRIGGER}\`\n` +
             '• Click **"Save"**'],
            
            ['2️⃣ **Wait for Bot Check**',
             `• Bot checks every **${CHECK_INTERVAL/1000} seconds**\n` +
             `• You'll get \`${ROLE_NAME}\` role automatically\n` +
             '• Usually takes 10-20 seconds'],
            
            ['3️⃣ **Verify You Have It**',
             `• Use \`$checkme\` to check your status\n` +
             `• Or check your roles list\n` +
             `• You should see \`${ROLE_NAME}\` in your roles`],
            
            ['4️⃣ **Keep or Remove**',
             `• Keep \`${STATUS_TRIGGER}\` in status = keep role\n` +
             `• Remove \`${STATUS_TRIGGER}\` = lose role in ${CHECK_INTERVAL/1000}s\n` +
             '• You can change it anytime!']
        ];
        
        steps.forEach(([title, content]) => {
            embed.addFields({ name: title, value: content, inline: false });
        });
        
        embed.addFields({
            name: '🔧 **Troubleshooting**',
            value: `• Role not appearing? Use \`$refresh\` (admin)\n` +
                   `• Check if bot is online with \`$ping\`\n` +
                   `• Make sure you spelled \`${STATUS_TRIGGER}\` exactly\n` +
                   '• Status visible to everyone?',
            inline: false
        });
        
        embed.setFooter({ text: 'Need help? Tag an admin or use $help' });
        
        await message.reply({ embeds: [embed] });
    }
});

// ================= UTILITY FUNCTIONS =================
async function getOrCreateRole(guild) {
    if (roleCache.has(guild.id)) {
        return roleCache.get(guild.id);
    }
    
    // Look for existing role
    const existingRole = guild.roles.cache.find(role => role.name === ROLE_NAME);
    if (existingRole) {
        roleCache.set(guild.id, existingRole);
        return existingRole;
    }
    
    // Create new role
    try {
        const newRole = await guild.roles.create({
            name: ROLE_NAME,
            color: 'Blue',
            reason: 'Auto-created for Pic Perms system'
        });
        
        console.log(`✅ Created '${ROLE_NAME}' role in ${guild.name}`);
        roleCache.set(guild.id, newRole);
        return newRole;
    } catch (error) {
        console.error(`❌ Failed to create role in ${guild.name}:`, error);
        return null;
    }
}

function hasTriggerInStatus(member) {
    if (!member.presence || !member.presence.activities) return false;
    
    for (const activity of member.presence.activities) {
        if (activity.name && activity.name.includes(STATUS_TRIGGER)) {
            return true;
        }
    }
    
    return false;
}

// ================= BACKGROUND LOOPS =================
function startLoops() {
    // Status check loop every 10 seconds
    statusCheckLoop = setInterval(async () => {
        try {
            for (const guild of client.guilds.cache.values()) {
                const picRole = await getOrCreateRole(guild);
                if (!picRole) continue;
                
                for (const member of guild.members.cache.values()) {
                    if (member.user.bot) continue;
                    
                    const hasTrigger = hasTriggerInStatus(member);
                    const hasRole = member.roles.cache.has(picRole.id);
                    
                    try {
                        if (hasTrigger && !hasRole) {
                            await member.roles.add(picRole);
                        } else if (!hasTrigger && hasRole) {
                            await member.roles.remove(picRole);
                        }
                    } catch (error) {
                        // Silently handle errors
                    }
                }
            }
        } catch (error) {
            console.error('Error in status check loop:', error);
        }
    }, CHECK_INTERVAL);
    
    // Reminder loop every 15 minutes
    reminderLoop = setInterval(async () => {
        try {
            for (const guild of client.guilds.cache.values()) {
                const generalChannel = guild.channels.cache.find(channel => 
                    channel.name.toLowerCase().includes('general') && 
                    channel.type === 0 // Text channel
                );
                
                if (generalChannel) {
                    const picRole = await getOrCreateRole(guild);
                    const withRole = picRole ? picRole.members.size : 0;
                    const total = guild.members.cache.filter(m => !m.user.bot).size;
                    
                    const embed = new EmbedBuilder()
                        .setTitle('🖼️ Want Picture Permissions?')
                        .setDescription(`**Put \`${STATUS_TRIGGER}\` in your status to get \`${ROLE_NAME}\` role!**`)
                        .setColor(0x800080);
                    
                    embed.addFields({
                        name: '⚡ Instant & Automatic:',
                        value: `• Bot checks every **${CHECK_INTERVAL/1000} seconds**\n` +
                               `• Get role in under **${CHECK_INTERVAL/1000} seconds**\n` +
                               `• Remove status = lose role automatically`,
                        inline: false
                    });
                    
                    embed.addFields({
                        name: '📊 Current Stats:',
                        value: `**${withRole}**/${total} members have the role\nUse \`$checkme\` to check your status!`,
                        inline: true
                    });
                    
                    embed.addFields({
                        name: '💬 Commands:',
                        value: '`$help` - All commands\n`$guide` - Step-by-step guide',
                        inline: true
                    });
                    
                    try {
                        await generalChannel.send({ embeds: [embed] });
                    } catch (error) {
                        // Can't send to channel
                    }
                }
            }
        } catch (error) {
            console.error('Error in reminder loop:', error);
        }
    }, 15 * 60 * 1000); // 15 minutes
}

// ================= EVENT HANDLERS =================
client.on('presenceUpdate', async (oldPresence, newPresence) => {
    if (!newPresence || !newPresence.member || newPresence.member.user.bot) return;
    
    const picRole = await getOrCreateRole(newPresence.member.guild);
    if (!picRole) return;
    
    const hasTrigger = hasTriggerInStatus(newPresence.member);
    const hasRole = newPresence.member.roles.cache.has(picRole.id);
    
    try {
        if (hasTrigger && !hasRole) {
            await newPresence.member.roles.add(picRole);
        } else if (!hasTrigger && hasRole) {
            await newPresence.member.roles.remove(picRole);
        }
    } catch (error) {
        // Silently handle
    }
});

// ================= ERROR HANDLING =================
client.on('error', (error) => {
    console.error('Discord.js error:', error);
});

process.on('unhandleRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

// ================= START BOT =================
console.log("ðŸ¤– Starting $ Command Pic Perms Bot...");
console.log(`ðŸ’¬ Prefix: $`);
console.log(`âš¡ Checking every ${CHECK_INTERVAL/1000} seconds`);
console.log(`ðŸŽ¯ Trigger: '${STATUS_TRIGGER}'`);
console.log("=".repeat(50));

if (!TOKEN) {
    console.error('âŒ ERROR: DISCORD_TOKEN environment variable is not set!');
    console.error('Please add it to your Railway Variables.');
    process.exit(1);
}

client.login(TOKEN).catch(error => {
    console.error('Failed to login:', error);
});
