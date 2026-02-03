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
const { Client, GatewayIntentBits, EmbedBuilder, ActivityType, PermissionsBitField, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, REST, Routes, SlashCommandBuilder, ChannelType, Events } = require('discord.js');
require('dotenv').config();

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OWNER_ID = process.env.OWNER_ID;

// Staff positions with limits and questions
const STAFF_POSITIONS = {
    "Manager": { 
        limit: 1, 
        color: 0xFF0000, 
        emoji: "👑",
        questions: [
            "1. Why should you be Manager?",
            "2. What changes would you make?",
            "3. How handle staff conflicts?",
            "4. Your server vision?",
            "5. Daily availability?",
            "6. Leadership experience?",
            "7. Final message?"
        ]
    },
    "Head Admin": { 
        limit: 1, 
        color: 0xFF4500, 
        emoji: "🔴",
        questions: [
            "1. Why Head Admin?",
            "2. Admin experience?",
            "3. How train new admins?",
            "4. Conflict resolution?",
            "5. Activity level?",
            "6. Server improvements?",
            "7. Why choose you?"
        ]
    },
    "Senior Admin": { 
        limit: 2, 
        color: 0xFF8C00, 
        emoji: "🟠",
        questions: [
            "1. Why Senior Admin?",
            "2. Previous experience?",
            "3. Handle rule breakers?",
            "4. Availability?",
            "5. Work with mods?",
            "6. Leadership style?",
            "7. Goals?"
        ]
    },
    "Junior Admin": { 
        limit: 2, 
        color: 0xFFA500, 
        emoji: "🟡",
        questions: [
            "1. Why Junior Admin?",
            "2. What to learn?",
            "3. Mod experience?",
            "4. Availability?",
            "5. Teamwork skills?",
            "6. Problem solving?",
            "7. Why you?"
        ]
    },
    "Head Mod": { 
        limit: 1, 
        color: 0x9ACD32, 
        emoji: "🟢",
        questions: [
            "1. What makes Head Mod?",
            "2. Organize mod team?",
            "3. Conflict experience?",
            "4. Daily availability?",
            "5. Training plans?",
            "6. Mod improvements?",
            "7. Why lead?"
        ]
    },
    "Senior Mod": { 
        limit: 2, 
        color: 0x00FF00, 
        emoji: "🔵",
        questions: [
            "1. Why Senior Mod?",
            "2. Difficult members?",
            "3. Favorite tools?",
            "4. Hours/week?",
            "5. Rule knowledge?",
            "6. Help juniors?",
            "7. Motivation?"
        ]
    },
    "Junior Mod": { 
        limit: 2, 
        color: 0x1E90FF, 
        emoji: "🟣",
        questions: [
            "1. Why be mod?",
            "2. Good moderator traits?",
            "3. Handle toxicity?",
            "4. Availability?",
            "5. Learn from?",
            "6. Rules knowledge?",
            "7. Final message"
        ]
    },
    "Head Staff": { 
        limit: 1, 
        color: 0x9370DB, 
        emoji: "⭐",
        questions: [
            "1. What's Head Staff?",
            "2. Improve staff morale?",
            "3. Leadership experience?",
            "4. Availability?",
            "5. Team building?",
            "6. Staff issues?",
            "7. Vision?"
        ]
    },
    "Senior Staff": { 
        limit: 2, 
        color: 0x8A2BE2, 
        emoji: "🌟",
        questions: [
            "1. Why Senior Staff?",
            "2. Contributions so far?",
            "3. What to change?",
            "4. Availability?",
            "5. Help juniors?",
            "6. Server impact?",
            "7. Goals?"
        ]
    },
    "Junior Staff": { 
        limit: 2, 
        color: 0xDA70D6, 
        emoji: "✨",
        questions: [
            "1. Why join staff?",
            "2. What to contribute?",
            "3. Enjoy about server?",
            "4. Availability?",
            "5. Skills?",
            "6. Learn?",
            "7. Why pick you?"
        ]
    },
    "Helper/Support": { 
        limit: 3, 
        color: 0xADD8E6, 
        emoji: "💠",
        questions: [
            "1. Why Helper/Support?",
            "2. Patient with new members?",
            "3. Help confused members?",
            "4. Availability?",
            "5. Knowledge level?",
            "6. Team player?",
            "7. Final thoughts"
        ]
    }
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildPresences
    ]
});

// Store data
const pendingApplications = new Map();
const userApplications = new Map();
const logChannels = new Map();
const applicationHistory = new Map();
const staffRoles = new Map();
const activePositions = new Map(); // Track current counts per server
const setupMessages = new Map(); // Track setup messages to delete old ones

// Slash Commands
const commands = [
    new SlashCommandBuilder()
        .setName('apply')
        .setDescription('Apply for a staff position'),
    
    new SlashCommandBuilder()
        .setName('logging')
        .setDescription('Set where applications go (Owner only)')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Select the logging channel')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)),
    
    new SlashCommandBuilder()
        .setName('applications')
        .setDescription('View pending applications (Owner only)'),
    
    new SlashCommandBuilder()
        .setName('positions')
        .setDescription('View available positions (only shows open ones)'),
    
    new SlashCommandBuilder()
        .setName('myapplication')
        .setDescription('Check your application status'),
    
    new SlashCommandBuilder()
        .setName('stats')
        .setDescription('View staff statistics'),
    
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show help menu'),
    
    new SlashCommandBuilder()
        .setName('setrole')
        .setDescription('Set role for position (Owner only)')
        .addStringOption(option =>
            option.setName('position')
                .setDescription('Staff position')
                .setRequired(true)
                .addChoices(
                    Object.keys(STAFF_POSITIONS).map(pos => ({ name: pos, value: pos }))
                ))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role to assign for this position')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('clearapps')
        .setDescription('Clear all pending applications (Owner only)'),
    
    new SlashCommandBuilder()
        .setName('setup-apply')
        .setDescription('Setup application system in channels (Owner only)')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to send application message (leave empty for all channels)')
                .addChannelTypes(ChannelType.GuildText)),
    
    new SlashCommandBuilder()
        .setName('refresh-slots')
        .setDescription('Refresh slot counts based on current roles (Owner only)')
];

// ================= BOT READY =================
client.once('ready', async () => {
    console.log("=".repeat(50));
    console.log(`✅ ${client.user.tag} is ONLINE!`);
    console.log(`📋 Staff Application System Active`);
    console.log(`👑 Owner ID: ${OWNER_ID}`);
    console.log("=".repeat(50));
    
    // Register slash commands
    const rest = new REST({ version: '10' }).setToken(TOKEN);
    try {
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('✅ Slash commands registered!');
    } catch (error) {
        console.error('❌ Error registering commands:', error);
    }
    
    // Initialize slot tracking for all guilds
    client.guilds.cache.forEach(guild => {
        refreshSlots(guild);
    });
    
    client.user.setActivity({
        name: `/apply for staff`,
        type: ActivityType.Watching
    });
});

// ================= SLASH COMMAND HANDLER =================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
    
    const { commandName, options } = interaction;
    
    if (commandName === 'apply') {
        await showApplyMenu(interaction);
    }
    
    else if (commandName === 'logging') {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ 
                content: '❌ Only the server owner can set the logging channel!', 
                ephemeral: true 
            });
        }
        
        const channel = options.getChannel('channel');
        logChannels.set(interaction.guild.id, channel.id);
        
        await interaction.reply({
            content: `✅ Logging channel set to ${channel}\nAll applications will now be sent here.`,
            ephemeral: true
        });
    }
    
    else if (commandName === 'applications') {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ 
                content: '❌ Only the server owner can view applications!', 
                ephemeral: true 
            });
        }
        
        const apps = pendingApplications.get(interaction.guild.id) || [];
        if (apps.length === 0) {
            return interaction.reply({ 
                content: '📭 No pending applications.', 
                ephemeral: true 
            });
        }
        
        const embed = new EmbedBuilder()
            .setTitle('📋 Pending Applications')
            .setColor(0xFFA500)
            .setDescription(`**${apps.length}** pending applications`);
        
        apps.forEach((app, i) => {
            const user = client.users.cache.get(app.userId);
            embed.addFields({
                name: `${i+1}. ${user?.username || 'Unknown'} - ${app.position}`,
                value: `ID: \`${app.id}\` | <t:${Math.floor(app.timestamp/1000)}:R>`,
                inline: true
            });
        });
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    else if (commandName === 'positions') {
        const embed = new EmbedBuilder()
            .setTitle('👥 Available Staff Positions')
            .setColor(0x0099FF)
            .setDescription('**Only showing OPEN positions**\nUse `/apply` or click the button below to start an application');
        
        let hasOpenPositions = false;
        const guildKey = interaction.guild.id;
        
        Object.entries(STAFF_POSITIONS).forEach(([position, data]) => {
            const current = getCurrentSlotCount(interaction.guild, position);
            
            // ONLY SHOW IF POSITION HAS SLOTS AVAILABLE
            if (current < data.limit) {
                hasOpenPositions = true;
                embed.addFields({
                    name: `${data.emoji} ${position}`,
                    value: `**Slots:** ${current}/${data.limit}\n**Status:** ${current >= data.limit ? '❌ FULL' : '✅ OPEN'}`,
                    inline: true
                });
            }
        });
        
        if (!hasOpenPositions) {
            embed.setDescription('❌ **All positions are currently full!**\nCheck back later for openings.');
        }
        
        const button = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('start_application')
                .setLabel('Apply Now')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📝')
        );
        
        await interaction.reply({ 
            embeds: [embed], 
            components: [button],
            ephemeral: false 
        });
    }
    
    else if (commandName === 'myapplication') {
        const apps = pendingApplications.get(interaction.guild.id) || [];
        const userApp = apps.find(app => app.userId === interaction.user.id);
        
        if (!userApp) {
            const userHistory = applicationHistory.get(`${interaction.user.id}_${interaction.guild.id}`) || [];
            if (userHistory.length > 0) {
                const lastApp = userHistory[userHistory.length - 1];
                const embed = new EmbedBuilder()
                    .setTitle('📋 Your Application History')
                    .setColor(0x0099FF)
                    .addFields(
                        { name: 'Position', value: lastApp.position, inline: true },
                        { name: 'Status', value: lastApp.status, inline: true },
                        { name: 'Date', value: `<t:${Math.floor(lastApp.timestamp / 1000)}:R>`, inline: true },
                        { name: 'Reason', value: lastApp.reason || 'No reason provided', inline: false }
                    );
                
                return interaction.reply({ embeds: [embed], ephemeral: true });
            }
            
            return interaction.reply({ 
                content: '📭 You have no pending applications or history.', 
                ephemeral: true 
            });
        }
        
        const embed = new EmbedBuilder()
            .setTitle('📋 Your Application Status')
            .setColor(0x0099FF)
            .addFields(
                { name: 'Position', value: userApp.position, inline: true },
                { name: 'Status', value: '⏳ Pending Review', inline: true },
                { name: 'Applied', value: `<t:${Math.floor(userApp.timestamp / 1000)}:R>`, inline: true },
                { name: 'Application ID', value: `\`${userApp.id}\``, inline: false }
            );
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    else if (commandName === 'stats') {
        const totalMembers = interaction.guild.memberCount;
        const staffCount = Object.keys(STAFF_POSITIONS).reduce((total, position) => {
            return total + getCurrentSlotCount(interaction.guild, position);
        }, 0);
        
        const pendingApps = pendingApplications.get(interaction.guild.id) || [];
        const logChannelId = logChannels.get(interaction.guild.id);
        const logChannel = logChannelId ? interaction.guild.channels.cache.get(logChannelId) : null;
        
        const embed = new EmbedBuilder()
            .setTitle('📊 Staff Statistics')
            .setColor(0x0099FF)
            .addFields(
                { name: '👥 Total Members', value: `**${totalMembers}**`, inline: true },
                { name: '👑 Current Staff', value: `**${staffCount}**`, inline: true },
                { name: '📋 Pending Apps', value: `**${pendingApps.length}**`, inline: true },
                { name: '📈 Staff Ratio', value: `**${((staffCount/totalMembers)*100).toFixed(1)}%**`, inline: true },
                { name: '📁 Log Channel', value: logChannel ? `${logChannel}` : '❌ Not set', inline: true }
            );
        
        await interaction.reply({ embeds: [embed], ephemeral: false });
    }
    
    else if (commandName === 'help') {
        const embed = new EmbedBuilder()
            .setTitle('🤖 Staff Application Bot Help')
            .setColor(0x0099FF)
            .setDescription('Apply for staff positions with this bot');
        
        embed.addFields(
            { name: '👤 User Commands', value: 'For everyone:', inline: false },
            { name: '/apply', value: 'Start staff application', inline: true },
            { name: '/positions', value: 'View available positions', inline: true },
            { name: '/myapplication', value: 'Check your application', inline: true },
            { name: '/stats', value: 'View statistics', inline: true }
        );
        
        if (interaction.user.id === OWNER_ID) {
            embed.addFields(
                { name: '👑 Owner Commands', value: 'Only you:', inline: false },
                { name: '/logging [#channel]', value: 'Set where applications go', inline: true },
                { name: '/applications', value: 'View pending apps', inline: true },
                { name: '/setrole [position] [role]', value: 'Link role to position', inline: true },
                { name: '/setup-apply [#channel]', value: 'Setup application message', inline: true },
                { name: '/clearapps', value: 'Clear all pending apps', inline: true },
                { name: '/refresh-slots', value: 'Refresh slot counts', inline: true }
            );
        }
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
    
    else if (commandName === 'setrole') {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ 
                content: '❌ Only the server owner can set roles!', 
                ephemeral: true 
            });
        }
        
        const position = options.getString('position');
        const role = options.getRole('role');
        
        const key = `${interaction.guild.id}_${position}`;
        staffRoles.set(key, role.id);
        
        await interaction.reply({
            content: `✅ Role ${role} set for position **${position}**\nUsers will receive this role when accepted.`,
            ephemeral: true
        });
    }
    
    else if (commandName === 'clearapps') {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ 
                content: '❌ Only the server owner can clear applications!', 
                ephemeral: true 
            });
        }
        
        const count = pendingApplications.get(interaction.guild.id)?.length || 0;
        pendingApplications.set(interaction.guild.id, []);
        
        await interaction.reply({
            content: `✅ Cleared **${count}** pending applications.`,
            ephemeral: true
        });
    }
    
    else if (commandName === 'setup-apply') {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ 
                content: '❌ Only the server owner can setup applications!', 
                ephemeral: true 
            });
        }
        
        const channel = options.getChannel('channel');
        
        // Delete old setup messages if they exist
        if (setupMessages.has(interaction.guild.id)) {
            const oldMessages = setupMessages.get(interaction.guild.id);
            for (const msgData of oldMessages) {
                try {
                    const ch = await interaction.guild.channels.fetch(msgData.channelId);
                    if (ch) {
                        const msg = await ch.messages.fetch(msgData.messageId);
                        if (msg) await msg.delete();
                    }
                } catch (error) {
                    // Message might already be deleted
                }
            }
        }
        
        // Create new setup messages
        const newMessageIds = [];
        
        if (channel) {
            // Send to specific channel
            await sendApplyMessage(channel, interaction.guild);
            newMessageIds.push({ channelId: channel.id, messageId: 'sent' });
        } else {
            // Send to all text channels
            const textChannels = interaction.guild.channels.cache.filter(ch => 
                ch.type === ChannelType.GuildText && 
                ch.permissionsFor(interaction.guild.members.me).has(PermissionsBitField.Flags.SendMessages)
            );
            
            for (const [_, ch] of textChannels) {
                try {
                    await sendApplyMessage(ch, interaction.guild);
                    newMessageIds.push({ channelId: ch.id, messageId: 'sent' });
                } catch (error) {
                    console.error(`Failed to send to ${ch.name}:`, error);
                }
            }
        }
        
        setupMessages.set(interaction.guild.id, newMessageIds);
        
        await interaction.reply({
            content: channel ? 
                `✅ Application message sent to ${channel}` : 
                `✅ Application message sent to ${newMessageIds.length} channels!`,
            ephemeral: true
        });
    }
    
    else if (commandName === 'refresh-slots') {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ 
                content: '❌ Only the server owner can refresh slots!', 
                ephemeral: true 
            });
        }
        
        refreshSlots(interaction.guild);
        
        await interaction.reply({
            content: '✅ Slot counts refreshed based on current roles!',
            ephemeral: true
        });
    }
});

// ================= SETUP APPLICATION MESSAGE =================
async function sendApplyMessage(channel, guild) {
    const embed = new EmbedBuilder()
        .setTitle('📝 Staff Applications Open!')
        .setDescription('Want to join our staff team? Apply now!')
        .setColor(0x0099FF)
        .addFields(
            { name: '👥 Available Positions', value: 'Click below to see all available positions', inline: false },
            { name: '📋 How to Apply', value: '1. Click "Apply Now"\n2. Choose a position\n3. Answer questions\n4. Submit application', inline: false },
            { name: '⏱️ Review Time', value: '24-48 hours', inline: true },
            { name: '👑 Reviewer', value: 'Owner Only', inline: true }
        )
        .setFooter({ text: 'Use /positions to see all available positions' });
    
    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('start_application')
            .setLabel('Apply Now')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📝'),
        new ButtonBuilder()
            .setLabel('View Positions')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://discord.com/application-directory/${CLIENT_ID}`)
    );
    
    await channel.send({ embeds: [embed], components: [buttons] });
}

// ================= BUTTON HANDLING =================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    
    // Handle application start from any channel
    if (interaction.customId === 'start_application') {
        if (!interaction.channel) {
            return interaction.reply({ 
                content: '❌ This command can only be used in server channels.', 
                ephemeral: true 
            });
        }
        
        // Check if user already has a pending application
        const pendingApps = pendingApplications.get(interaction.guild.id) || [];
        const hasPending = pendingApps.some(app => app.userId === interaction.user.id);
        
        if (hasPending) {
            return interaction.reply({ 
                content: '❌ You already have a pending application!', 
                ephemeral: true 
            });
        }
        
        // Check if user already has a staff role
        const hasStaffRole = interaction.member.roles.cache.some(role => 
            Object.keys(STAFF_POSITIONS).some(pos => role.name === pos)
        );
        
        if (hasStaffRole) {
            return interaction.reply({ 
                content: '❌ You already have a staff role!', 
                ephemeral: true 
            });
        }
        
        await showPositionSelect(interaction);
    }
    
    else if (interaction.customId.startsWith('select_position_')) {
        const position = interaction.customId.replace('select_position_', '');
        await startApplication(interaction, position);
    }
    
    else if (interaction.customId.startsWith('submit_')) {
        const position = interaction.customId.replace('submit_', '');
        await submitApplication(interaction, position);
    }
    
    else if (interaction.customId === 'cancel_application') {
        const key = `${interaction.user.id}_${interaction.guild.id}`;
        userApplications.delete(key);
        await interaction.update({ 
            content: '❌ Application cancelled.', 
            embeds: [], 
            components: [],
            ephemeral: true 
        });
    }
    
    // ================= OWNER ACTION BUTTONS =================
    else if (interaction.customId.startsWith('owner_')) {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ 
                content: '❌ Only the server owner can review applications!', 
                ephemeral: true 
            });
        }
        
        const [_, action, appId] = interaction.customId.split('_');
        
        if (action === 'accept' || action === 'deny') {
            await handleOwnerDecision(interaction, appId, action);
        } 
        else if (action === 'accept_reason' || action === 'deny_reason') {
            await showReasonModal(interaction, appId, action);
        } 
        else if (action === 'history') {
            await showUserHistory(interaction, appId);
        } 
        else if (action === 'ticket') {
            await createTicket(interaction, appId);
        }
    }
});

// ================= MODAL HANDLING =================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isModalSubmit()) return;
    
    if (interaction.customId.startsWith('answer_')) {
        const [_, position, qIndex] = interaction.customId.split('_');
        const answer = interaction.fields.getTextInputValue('answer');
        
        const key = `${interaction.user.id}_${interaction.guild.id}`;
        if (!userApplications.has(key)) {
            userApplications.set(key, { 
                position, 
                answers: [],
                startTime: Date.now() 
            });
        }
        
        const appData = userApplications.get(key);
        appData.answers[qIndex] = answer;
        
        const nextIndex = parseInt(qIndex) + 1;
        const totalQuestions = STAFF_POSITIONS[position].questions.length;
        
        if (nextIndex < totalQuestions) {
            await showQuestion(interaction, position, nextIndex);
        } else {
            await showApplicationSummary(interaction, position);
        }
    }
    
    else if (interaction.customId.startsWith('reason_')) {
        const [_, action, appId] = interaction.customId.split('_');
        const reason = interaction.fields.getTextInputValue('reason');
        
        await handleOwnerDecision(interaction, appId, action, reason);
    }
});

// ================= ROLE CHANGE TRACKING =================
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
    // Check if roles were removed
    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;
    
    // Find removed roles that are staff positions
    const removedRoles = oldRoles.filter(role => 
        Object.keys(STAFF_POSITIONS).includes(role.name) &&
        !newRoles.has(role.id)
    );
    
    if (removedRoles.size > 0) {
        removedRoles.forEach(role => {
            // When role is removed, increase slot count
            const guildKey = newMember.guild.id;
            const currentSlots = getCurrentSlotCount(newMember.guild, role.name);
            const limit = STAFF_POSITIONS[role.name].limit;
            
            // Slot count should never exceed limit
            if (currentSlots < limit) {
                // Slot count automatically updated via getCurrentSlotCount
                console.log(`📊 ${role.name} role removed from ${newMember.user.tag}, slots available: ${currentSlots}/${limit}`);
            }
        });
    }
});

// ================= APPLICATION FUNCTIONS =================
async function showApplyMenu(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('📝 Staff Application')
        .setDescription('Click the button below to start your application!')
        .setColor(0x0099FF)
        .addFields(
            { name: '📋 Process', value: '1. Choose position\n2. Answer questions\n3. Submit application\n4. Owner reviews', inline: false },
            { name: '⚠️ Note', value: 'Only shows positions that have available slots', inline: false }
        );
    
    const button = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('start_application')
            .setLabel('Start Application')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📝')
    );
    
    await interaction.reply({ 
        embeds: [embed], 
        components: [button],
        ephemeral: true 
    });
}

async function showPositionSelect(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('Step 1: Choose Position')
        .setDescription('**Only showing positions with available slots:**')
        .setColor(0x0099FF);
    
    const buttons = [];
    let hasAvailablePositions = false;
    
    Object.entries(STAFF_POSITIONS).forEach(([position, data]) => {
        const current = getCurrentSlotCount(interaction.guild, position);
        
        // ONLY SHOW IF SLOTS AVAILABLE
        if (current < data.limit) {
            hasAvailablePositions = true;
            buttons.push(
                new ButtonBuilder()
                    .setCustomId(`select_position_${position}`)
                    .setLabel(`${position} (${current}/${data.limit})`)
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(data.emoji)
            );
        }
    });
    
    if (!hasAvailablePositions) {
        return interaction.reply({ 
            content: '❌ All positions are currently full! Try again later.', 
            embeds: [], 
            components: [],
            ephemeral: true 
        });
    }
    
    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
        rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 5)));
    }
    
    if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ 
            embeds: [embed], 
            components: rows 
        });
    } else {
        await interaction.reply({ 
            embeds: [embed], 
            components: rows,
            ephemeral: true 
        });
    }
}

async function startApplication(interaction, position) {
    const data = STAFF_POSITIONS[position];
    const current = getCurrentSlotCount(interaction.guild, position);
    
    if (current >= data.limit) {
        return interaction.update({ 
            content: `❌ ${position} is now full (${current}/${data.limit})!`, 
            embeds: [], 
            components: [],
            ephemeral: true 
        });
    }
    
    // Check if user already has this staff role
    const hasRole = interaction.member.roles.cache.some(role => 
        role.name === position
    );
    
    if (hasRole) {
        return interaction.update({ 
            content: `❌ You already have the ${position} role!`, 
            embeds: [], 
            components: [],
            ephemeral: true 
        });
    }
    
    await showQuestion(interaction, position, 0);
}

async function showQuestion(interaction, position, questionIndex) {
    const data = STAFF_POSITIONS[position];
    const question = data.questions[questionIndex];
    
    const modal = new ModalBuilder()
        .setCustomId(`answer_${position}_${questionIndex}`)
        .setTitle(`${position} - Question ${questionIndex + 1}`);
    
    const input = new TextInputBuilder()
        .setCustomId('answer')
        .setLabel(`Question ${questionIndex + 1}/${data.questions.length}`)
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setPlaceholder(`Answer: ${question}`)
        .setMaxLength(1000);
    
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    
    await interaction.showModal(modal);
}

async function showApplicationSummary(interaction, position) {
    const key = `${interaction.user.id}_${interaction.guild.id}`;
    const appData = userApplications.get(key);
    const data = STAFF_POSITIONS[position];
    const duration = Math.floor((Date.now() - appData.startTime) / 1000);
    
    const embed = new EmbedBuilder()
        .setTitle('📋 Application Summary')
        .setDescription(`**Position:** ${position}\n**Questions Answered:** ${appData.answers.length}/${data.questions.length}\n**Time Taken:** ${duration}s`)
        .setColor(data.color);
    
    // Show preview
    for (let i = 0; i < Math.min(2, appData.answers.length); i++) {
        const answer = appData.answers[i] || 'No answer';
        const preview = answer.length > 100 ? answer.substring(0, 100) + '...' : answer;
        embed.addFields({
            name: `Q${i + 1} Preview`,
            value: preview,
            inline: false
        });
    }
    
    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`submit_${position}`)
            .setLabel('Submit Application')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅'),
        new ButtonBuilder()
            .setCustomId('cancel_application')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌')
    );
    
    if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ 
            embeds: [embed], 
            components: [buttons],
            ephemeral: true 
        });
    } else {
        await interaction.reply({ 
            embeds: [embed], 
            components: [buttons],
            ephemeral: true 
        });
    }
}

async function submitApplication(interaction, position) {
    const key = `${interaction.user.id}_${interaction.guild.id}`;
    const appData = userApplications.get(key);
    
    if (!appData) {
        return interaction.reply({ 
            content: '❌ Application data not found!', 
            ephemeral: true 
        });
    }
    
    const current = getCurrentSlotCount(interaction.guild, position);
    const limit = STAFF_POSITIONS[position].limit;
    
    if (current >= limit) {
        userApplications.delete(key);
        return interaction.update({ 
            content: `❌ ${position} is now full (${current}/${limit})!`, 
            embeds: [], 
            components: [],
            ephemeral: true 
        });
    }
    
    const appId = generateId();
    const application = {
        id: appId,
        userId: interaction.user.id,
        username: interaction.user.username,
        discriminator: interaction.user.discriminator,
        avatar: interaction.user.displayAvatarURL(),
        position: position,
        answers: appData.answers,
        duration: Math.floor((Date.now() - appData.startTime) / 1000),
        timestamp: Date.now(),
        memberSince: interaction.member.joinedTimestamp,
        guildId: interaction.guild.id
    };
    
    // Store in pending applications
    if (!pendingApplications.has(interaction.guild.id)) {
        pendingApplications.set(interaction.guild.id, []);
    }
    pendingApplications.get(interaction.guild.id).push(application);
    
    userApplications.delete(key);
    
    // Send confirmation to user
    await interaction.update({
        embeds: [
            new EmbedBuilder()
                .setTitle('✅ Application Submitted!')
                .setDescription(`Your application for **${position}** has been submitted.`)
                .setColor(0x00FF00)
                .addFields(
                    { name: 'Application ID', value: `\`${appId}\``, inline: true },
                    { name: 'Position', value: position, inline: true },
                    { name: 'Status', value: '⏳ Pending Owner Review', inline: true },
                    { name: 'Slots Remaining', value: `${limit - current - 1}/${limit}`, inline: false }
                )
        ],
        components: []
    });
    
    // Send to LOGGING CHANNEL
    await sendToLogChannel(interaction, application);
}

// ================= LOG CHANNEL DISPLAY =================
async function sendToLogChannel(interaction, application) {
    const logChannelId = logChannels.get(interaction.guild.id);
    
    if (!logChannelId) {
        console.log(`No log channel set for guild ${interaction.guild.id}`);
        try {
            const owner = await client.users.fetch(OWNER_ID);
            await owner.send(`❌ No log channel set for ${interaction.guild.name}!\nUse \`/logging #channel\` to set where applications should go.`);
        } catch (error) {
            console.error('Could not DM owner:', error);
        }
        return;
    }
    
    const logChannel = interaction.guild.channels.cache.get(logChannelId);
    
    if (!logChannel) {
        console.error(`Log channel ${logChannelId} not found`);
        return;
    }
    
    const data = STAFF_POSITIONS[application.position];
    const memberSince = Math.floor(application.memberSince / 1000);
    const currentSlots = getCurrentSlotCount(interaction.guild, application.position);
    const slotsAfter = Math.max(0, currentSlots); // Application doesn't take slot until accepted
    
    // Format exactly like your screenshot
    let logContent = `**${application.username}'s Application for ${application.position}**\n\n`;
    logContent += '**Application Submitted**\n\n';
    
    // Add questions and answers
    data.questions.forEach((question, index) => {
        const answer = application.answers[index] || 'No answer provided';
        logContent += `${question}\n`;
        logContent += `${answer}\n\n`;
    });
    
    logContent += '## Submission Stats\n';
    logContent += `**UserId:** ${application.userId}\n`;
    logContent += `**Username:** ${application.username}\n`;
    logContent += `**User:** <@${application.userId}>\n`;
    logContent += `**Duration:** ${application.duration}s\n`;
    logContent += `**Joined guild** <t:${memberSince}:R>\n`;
    logContent += `**Submitted:** <t:${Math.floor(application.timestamp / 1000)}:R>\n`;
    logContent += `**Position:** ${application.position}\n`;
    logContent += `**Slots:** ${slotsAfter}/${data.limit}\n`;
    
    // Create embed
    const embed = new EmbedBuilder()
        .setDescription(logContent.substring(0, 4096))
        .setColor(data.color)
        .setThumbnail(application.avatar)
        .setFooter({ text: `Application ID: ${application.id}` });
    
    // ================= CREATE EXACT BUTTONS FROM YOUR SCREENSHOT =================
    const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`owner_accept_${application.id}`)
            .setLabel('Accept')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`owner_deny_${application.id}`)
            .setLabel('Deny')
            .setStyle(ButtonStyle.Danger)
    );
    
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`owner_accept_reason_${application.id}`)
            .setLabel('Accept with reason')
            .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId(`owner_deny_reason_${application.id}`)
            .setLabel('Deny with reason')
            .setStyle(ButtonStyle.Danger)
    );
    
    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`owner_history_${application.id}`)
            .setLabel('History')
            .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
            .setCustomId(`owner_ticket_${application.id}`)
            .setLabel('Open ticket with user')
            .setStyle(ButtonStyle.Secondary)
    );
    
    const row4 = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('View submission on dashboard')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://discord.com/users/${application.userId}`)
    );
    
    await logChannel.send({ 
        content: `📬 New application from <@${application.userId}>`, 
        embeds: [embed], 
        components: [row1, row2, row3, row4] 
    });
}

// ================= OWNER DECISION FUNCTIONS =================
async function handleOwnerDecision(interaction, appId, action, reason = 'No reason provided') {
    const apps = pendingApplications.get(interaction.guild.id) || [];
    const appIndex = apps.findIndex(app => app.id === appId);
    
    if (appIndex === -1) {
        return interaction.reply({ 
            content: '❌ Application not found!', 
            ephemeral: true 
        });
    }
    
    const application = apps[appIndex];
    const user = await client.users.fetch(application.userId).catch(() => null);
    
    // Remove from pending
    apps.splice(appIndex, 1);
    pendingApplications.set(interaction.guild.id, apps);
    
    // Store in history
    const historyKey = `${application.userId}_${application.guildId}`;
    if (!applicationHistory.has(historyKey)) {
        applicationHistory.set(historyKey, []);
    }
    
    const decision = {
        position: application.position,
        status: action.includes('accept') ? 'ACCEPTED' : 'DENIED',
        reason: reason,
        timestamp: Date.now(),
        reviewedBy: interaction.user.tag
    };
    
    applicationHistory.get(historyKey).push(decision);
    
    if (action === 'accept' || action === 'accept_reason') {
        // Find role for this position
        const key = `${interaction.guild.id}_${application.position}`;
        let roleId = staffRoles.get(key);
        
        if (!roleId) {
            // Try to find role by name
            const role = interaction.guild.roles.cache.find(r => r.name === application.position);
            if (role) {
                roleId = role.id;
                staffRoles.set(key, roleId);
            }
        }
        
        const member = await interaction.guild.members.fetch(application.userId).catch(() => null);
        
        if (roleId && member) {
            const role = interaction.guild.roles.cache.get(roleId);
            if (role) {
                // Check current slot count before giving role
                const currentBefore = getCurrentSlotCount(interaction.guild, application.position);
                const limit = STAFF_POSITIONS[application.position].limit;
                
                if (currentBefore >= limit) {
                    return interaction.reply({
                        content: `❌ Cannot accept! ${application.position} is now full (${currentBefore}/${limit})`,
                        ephemeral: true
                    });
                }
                
                await member.roles.add(role);
                
                // Update slot count (will be reflected in getCurrentSlotCount)
                const currentAfter = getCurrentSlotCount(interaction.guild, application.position);
                
                // Send DM to user
                try {
                    await user.send({
                        embeds: [
                            new EmbedBuilder()
                                .setTitle('🎉 Application Accepted!')
                                .setDescription(`Your application for **${application.position}** has been **accepted**!`)
                                .setColor(0x00FF00)
                                .addFields(
                                    { name: 'Position', value: application.position, inline: true },
                                    { name: 'Role Given', value: role.name, inline: true },
                                    { name: 'Slots Now', value: `${currentAfter}/${limit}`, inline: true },
                                    { name: 'Accepted By', value: interaction.user.tag, inline: true },
                                    { name: 'Reason', value: reason, inline: false }
                                )
                        ]
                    });
                } catch (error) {
                    console.log(`Could not DM ${user?.tag}`);
                }
                
                // DELETE THE APPLICATION MESSAGE (vanishes after decision)
                try {
                    await interaction.message.delete();
                } catch (error) {
                    console.log('Could not delete message:', error);
                }
                
                await interaction.reply({
                    content: `✅ Accepted ${user?.tag || 'Unknown'}'s application!\nRole **${role.name}** has been given.\n**Slots:** ${currentAfter}/${limit}`,
                    ephemeral: true
                });
                
                return;
            }
        }
        
        // Fallback if role not found
        await interaction.reply({
            content: `✅ Accepted ${user?.tag || 'Unknown'}'s application!\n⚠️ Role not found - please set it with \`/setrole\`.`,
            ephemeral: true
        });
        
        // Delete the message
        try {
            await interaction.message.delete();
        } catch (error) {
            console.log('Could not delete message:', error);
        }
        
    } else if (action === 'deny' || action === 'deny_reason') {
        // Send DM to user
        try {
            await user.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('❌ Application Denied')
                        .setDescription(`Your application for **${application.position}** has been **denied**.`)
                        .setColor(0xFF0000)
                        .addFields(
                            { name: 'Position', value: application.position, inline: true },
                            { name: 'Denied By', value: interaction.user.tag, inline: true },
                            { name: 'Reason', value: reason, inline: false }
                        )
                ]
            });
        } catch (error) {
            console.log(`Could not DM ${user?.tag}`);
        }
        
        // DELETE THE APPLICATION MESSAGE (vanishes after decision)
        try {
            await interaction.message.delete();
        } catch (error) {
            console.log('Could not delete message:', error);
        }
        
        await interaction.reply({
            content: `❌ Denied ${user?.tag || 'Unknown'}'s application.`,
            ephemeral: true
        });
    }
}

async function showReasonModal(interaction, appId, action) {
    const modal = new ModalBuilder()
        .setCustomId(`reason_${action}_${appId}`)
        .setTitle(`${action === 'accept_reason' ? 'Accept' : 'Deny'} with Reason`);
    
    const input = new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('Enter your reason')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setPlaceholder('Type your reason here...')
        .setMaxLength(1000);
    
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    
    await interaction.showModal(modal);
}

async function showUserHistory(interaction, appId) {
    const apps = pendingApplications.get(interaction.guild.id) || [];
    const application = apps.find(app => app.id === appId);
    
    if (!application) {
        return interaction.reply({ 
            content: '❌ Application not found!', 
            ephemeral: true 
        });
    }
    
    const historyKey = `${application.userId}_${application.guildId}`;
    const userHistory = applicationHistory.get(historyKey) || [];
    
    if (userHistory.length === 0) {
        return interaction.reply({ 
            content: '📭 No previous applications found for this user.', 
            ephemeral: true 
        });
    }
    
    const embed = new EmbedBuilder()
        .setTitle(`📋 Application History - ${application.username}`)
        .setColor(0x0099FF)
        .setDescription(`**Current Application:** ${application.position}`);
    
    userHistory.forEach((app, i) => {
        const statusEmoji = app.status === 'ACCEPTED' ? '✅' : '❌';
        embed.addFields({
            name: `${i + 1}. ${app.position} - ${statusEmoji} ${app.status}`,
            value: `**Reason:** ${app.reason}\n**Reviewed by:** ${app.reviewedBy}\n**Date:** <t:${Math.floor(app.timestamp / 1000)}:R>`,
            inline: false
        });
    });
    
    await interaction.reply({ 
        embeds: [embed], 
        ephemeral: true 
    });
}

async function createTicket(interaction, appId) {
    const apps = pendingApplications.get(interaction.guild.id) || [];
    const application = apps.find(app => app.id === appId);
    
    if (!application) {
        return interaction.reply({ 
            content: '❌ Application not found!', 
            ephemeral: true 
        });
    }
    
    try {
        const channel = await interaction.channel.threads.create({
            name: `ticket-${application.username}`,
            autoArchiveDuration: 1440,
            reason: `Application review for ${application.position}`,
            type: ChannelType.PrivateThread
        });
        
        await channel.members.add(application.userId);
        await channel.members.add(OWNER_ID);
        
        await channel.send({
            content: `<@${application.userId}> <@${OWNER_ID}>`,
            embeds: [
                new EmbedBuilder()
                    .setTitle('🎫 Application Ticket')
                    .setDescription(`Ticket created for ${application.username}'s application`)
                    .addFields(
                        { name: 'Position', value: application.position, inline: true },
                        { name: 'User', value: `<@${application.userId}>`, inline: true },
                        { name: 'Application ID', value: `\`${appId}\``, inline: true }
                    )
                    .setColor(0x0099FF)
            ]
        });
        
        await interaction.reply({
            content: `✅ Ticket created: ${channel}`,
            ephemeral: true
        });
        
    } catch (error) {
        console.error('Error creating ticket:', error);
        await interaction.reply({
            content: '❌ Could not create ticket. Check bot permissions.',
            ephemeral: true
        });
    }
}

// ================= HELPER FUNCTIONS =================
function getCurrentSlotCount(guild, position) {
    // Always count current members with the role
    const role = guild.roles.cache.find(r => r.name === position);
    if (!role) return 0;
    
    return role.members.size;
}

function refreshSlots(guild) {
    // This function updates our tracking based on current roles
    console.log(`🔄 Refreshing slot counts for ${guild.name}`);
    
    Object.keys(STAFF_POSITIONS).forEach(position => {
        const count = getCurrentSlotCount(guild, position);
        const limit = STAFF_POSITIONS[position].limit;
        
        if (count > limit) {
            console.warn(`⚠️ ${position} has ${count} members but limit is ${limit}!`);
        }
    });
}

function generateId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ================= LOGIN =================
client.login(TOKEN).catch(error => {
    console.error('❌ Failed to login:', error);
    process.exit(1);
});
