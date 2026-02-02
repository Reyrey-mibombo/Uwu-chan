const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, PermissionsBitField } = require('discord.js');
require('dotenv').config();

// Configuration - CHANGE THESE IF NEEDED
const ROLE_NAME = "Pic Perms";  // Make sure this EXACTLY matches your role name
const STATUS_TRIGGER = "/Asclade";  // What users put in their status
const CHECK_INTERVAL = 10000; // 10 seconds
const TOKEN = process.env.DISCORD_TOKEN;

// Bot setup with ALL required intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,     // REQUIRED for seeing members
        GatewayIntentBits.GuildPresences,   // REQUIRED for seeing statuses
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const roleCache = new Map();

// ================= BOT READY =================
client.once('ready', async () => {
    console.log("=".repeat(50));
    console.log(`✅ ${client.user.tag} is ONLINE!`);
    console.log(`🔍 Looking for: '${STATUS_TRIGGER}' in user statuses`);
    console.log(`👑 Giving role: '${ROLE_NAME}'`);
    console.log(`⏱️ Checking every: ${CHECK_INTERVAL/1000} seconds`);
    console.log("=".repeat(50));
    
    // Set bot status
    client.user.setActivity({
        name: `for ${STATUS_TRIGGER} | $help`,
        type: ActivityType.Watching
    });
    
    // Start checking
    startStatusChecker();
});

// ================= IMPROVED STATUS DETECTION =================
function hasTriggerInStatus(member) {
    if (!member || !member.presence || !member.presence.activities) {
        return false;
    }
    
    const activities = member.presence.activities;
    
    for (const activity of activities) {
        // Method 1: Check custom status (type 4)
        if (activity.type === 4) { // 4 = CUSTOM_STATUS
            if (activity.state && activity.state.includes(STATUS_TRIGGER)) {
                console.log(`✅ Found '${STATUS_TRIGGER}' in custom status of ${member.user.tag}`);
                return true;
            }
        }
        
        // Method 2: Check any activity name
        if (activity.name && activity.name.includes(STATUS_TRIGGER)) {
            console.log(`✅ Found '${STATUS_TRIGGER}' in activity of ${member.user.tag}`);
            return true;
        }
        
        // Method 3: Check state (for all activity types)
        if (activity.state && activity.state.includes(STATUS_TRIGGER)) {
            console.log(`✅ Found '${STATUS_TRIGGER}' in state of ${member.user.tag}`);
            return true;
        }
    }
    
    return false;
}

// ================= GET ROLE FUNCTION =================
async function getRole(guild) {
    if (roleCache.has(guild.id)) {
        return roleCache.get(guild.id);
    }
    
    // Find existing role
    const role = guild.roles.cache.find(r => r.name === ROLE_NAME);
    
    if (role) {
        roleCache.set(guild.id, role);
        console.log(`✅ Found '${ROLE_NAME}' role in ${guild.name}`);
        return role;
    } else {
        console.log(`❌ Could not find '${ROLE_NAME}' role in ${guild.name}`);
        console.log(`Available roles: ${guild.roles.cache.map(r => r.name).join(', ')}`);
        return null;
    }
}

// ================= MAIN CHECKING LOOP =================
function startStatusChecker() {
    setInterval(async () => {
        try {
            console.log(`🔄 Checking all members...`);
            let checked = 0;
            let updated = 0;
            
            for (const guild of client.guilds.cache.values()) {
                // Get the role
                const picRole = await getRole(guild);
                if (!picRole) continue;
                
                // Fetch all members to ensure we have fresh data
                await guild.members.fetch();
                
                for (const member of guild.members.cache.values()) {
                    if (member.user.bot) continue;
                    
                    checked++;
                    const hasTrigger = hasTriggerInStatus(member);
                    const hasRole = member.roles.cache.has(picRole.id);
                    
                    try {
                        if (hasTrigger && !hasRole) {
                            // Give role
                            await member.roles.add(picRole);
                            updated++;
                            console.log(`🎁 Gave '${ROLE_NAME}' to ${member.user.tag}`);
                        } else if (!hasTrigger && hasRole) {
                            // Remove role
                            await member.roles.remove(picRole);
                            updated++;
                            console.log(`🗑️ Removed '${ROLE_NAME}' from ${member.user.tag}`);
                        }
                    } catch (error) {
                        console.error(`❌ Error with ${member.user.tag}: ${error.message}`);
                    }
                }
            }
            
            if (updated > 0) {
                console.log(`📊 Checked ${checked} members, updated ${updated} roles`);
            }
        } catch (error) {
            console.error('Error in status checker:', error);
        }
    }, CHECK_INTERVAL);
}

// ================= COMMANDS =================
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('$')) return;
    
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    // ================= $test COMMAND =================
    if (command === 'test' || command === 'debug') {
        const member = message.member;
        const picRole = await getRole(message.guild);
        
        let response = `**🧪 Test Results for ${member.user.tag}:**\n`;
        response += `• Bot is online: ✅ YES\n`;
        response += `• Looking for: \`${STATUS_TRIGGER}\`\n`;
        response += `• Role found: ${picRole ? '✅ YES' : '❌ NO'}\n`;
        
        // Check status
        const hasTrigger = hasTriggerInStatus(member);
        const hasRole = picRole ? member.roles.cache.has(picRole.id) : false;
        
        response += `• Status detected: ${hasTrigger ? '✅ YES' : '❌ NO'}\n`;
        response += `• Has role: ${hasRole ? '✅ YES' : '❌ NO'}\n`;
        
        // Show current activities
        if (member.presence?.activities?.length > 0) {
            response += `\n**📋 Your Current Status:**\n`;
            member.presence.activities.forEach((activity, i) => {
                response += `${i+1}. **Type:** ${getActivityType(activity.type)} | `;
                response += `**Name:** "${activity.name || 'None'}" | `;
                response += `**Text:** "${activity.state || 'None'}"\n`;
            });
        } else {
            response += `\n**📋 Your Current Status:** No status set\n`;
        }
        
        response += `\n**💡 Tip:** Set your status to: \`${STATUS_TRIGGER}\``;
        
        await message.reply(response);
    }
    
    // ================= $checkme COMMAND =================
    else if (command === 'checkme') {
        const member = message.member;
        const picRole = await getRole(message.guild);
        const hasTrigger = hasTriggerInStatus(member);
        const hasRole = picRole ? member.roles.cache.has(picRole.id) : false;
        
        const embed = new EmbedBuilder()
            .setTitle(`🔍 Status Check for ${member.user.username}`)
            .setColor(hasTrigger ? 0x00FF00 : 0xFF0000);
        
        embed.addFields({
            name: '✅ Trigger Check',
            value: `Looking for \`${STATUS_TRIGGER}\` in your status: **${hasTrigger ? 'FOUND!' : 'NOT FOUND'}**`,
            inline: false
        });
        
        embed.addFields({
            name: '👑 Role Status',
            value: `\`${ROLE_NAME}\` role: **${hasRole ? 'HAS IT!' : 'DOES NOT HAVE'}**`,
            inline: false
        });
        
        if (!hasTrigger) {
            embed.addFields({
                name: '🚀 How to get the role:',
                value: `1. Click your profile picture\n2. Select "Set Custom Status"\n3. Type: \`${STATUS_TRIGGER}\`\n4. Click "Save"\n⏱️ Role will appear in **10 seconds**`,
                inline: false
            });
        } else if (!hasRole) {
            embed.addFields({
                name: '⏳ Almost there!',
                value: `✅ You have the status!\n⏱️ Role should appear in **10 seconds**`,
                inline: false
            });
        } else {
            embed.addFields({
                name: '🎉 Perfect!',
                value: `✅ You have both the status and role!`,
                inline: false
            });
        }
        
        await message.reply({ embeds: [embed] });
    }
    
    // ================= $help COMMAND =================
    else if (command === 'help') {
        const embed = new EmbedBuilder()
            .setTitle('🤖 Pic Perms Bot Help')
            .setDescription(`Put \`${STATUS_TRIGGER}\` in your status to get the \`${ROLE_NAME}\` role!`)
            .setColor(0x0099FF);
        
        embed.addFields(
            { name: '`$test`', value: 'Check if bot can see your status', inline: true },
            { name: '`$checkme`', value: 'Check your status & role', inline: true },
            { name: '`$help`', value: 'Show this help menu', inline: true }
        );
        
        embed.addFields({
            name: '⚡ How it works:',
            value: `1. Put \`${STATUS_TRIGGER}\` in your Discord status\n2. Bot checks every **10 seconds**\n3. Get \`${ROLE_NAME}\` role automatically!`,
            inline: false
        });
        
        await message.reply({ embeds: [embed] });
    }
});

// ================= HELPER FUNCTION =================
function getActivityType(type) {
    const types = {
        0: 'Playing',
        1: 'Streaming',
        2: 'Listening',
        3: 'Watching',
        4: 'Custom Status'  // THIS IS WHAT WE WANT!
    };
    return types[type] || `Unknown (${type})`;
}

// ================= PRESENCE UPDATE EVENT =================
client.on('presenceUpdate', async (oldPresence, newPresence) => {
    if (!newPresence || !newPresence.member || newPresence.member.user.bot) return;
    
    const picRole = await getRole(newPresence.member.guild);
    if (!picRole) return;
    
    const hasTrigger = hasTriggerInStatus(newPresence.member);
    const hasRole = newPresence.member.roles.cache.has(picRole.id);
    
    try {
        if (hasTrigger && !hasRole) {
            await newPresence.member.roles.add(picRole);
            console.log(`⚡ Gave role to ${newPresence.member.user.tag} (instant update)`);
        } else if (!hasTrigger && hasRole) {
            await newPresence.member.roles.remove(picRole);
            console.log(`⚡ Removed role from ${newPresence.member.user.tag} (instant update)`);
        }
    } catch (error) {
        console.error(`Instant update error:`, error.message);
    }
});

// ================= ERROR HANDLING =================
client.on('error', console.error);
process.on('unhandledRejection', console.error);

// ================= START BOT =================
if (!TOKEN) {
    console.error('❌ ERROR: DISCORD_TOKEN is not set!');
    process.exit(1);
}

console.log(`🤖 Starting bot...`);
console.log(`🔍 Looking for: "${STATUS_TRIGGER}"`);
console.log(`👑 Giving role: "${ROLE_NAME}"`);

client.login(TOKEN);
