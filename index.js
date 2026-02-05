const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActivityType, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    REST, 
    Routes, 
    SlashCommandBuilder 
} = require('discord.js');
require('dotenv').config();

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const OWNER_ID = process.env.OWNER_ID;

// ==================== PIC PERMS CONFIG ====================
const ROLE_NAME = "Pic Perms";
const STATUS_TRIGGER = "/Asclade";
const CHECK_INTERVAL = 10000; // 10 seconds
const roleCache = new Map();

// ==================== STAFF POSITIONS (7 QUESTIONS EACH) ====================
const STAFF_POSITIONS = {
    "Manager": { 
        limit: 1, 
        color: 0xFF0000, 
        emoji: "👑",
        questions: [
            "1. Why should you be Manager? (List qualifications)",
            "2. What specific changes would you implement?",
            "3. How would you handle staff conflicts?",
            "4. Describe your vision for server growth",
            "5. What is your daily availability?",
            "6. Share your leadership experience",
            "7. Final message: Why choose you?"
        ]
    },
    "Head Admin": { 
        limit: 1, 
        color: 0xFF4500, 
        emoji: "🔴",
        questions: [
            "1. Why do you want to be Head Admin?",
            "2. What is your admin experience?",
            "3. How would you train new admins?",
            "4. Describe conflict resolution approach",
            "5. What is your activity level?",
            "6. What server improvements would you suggest?",
            "7. Why trust you with admin powers?"
        ]
    },
    "Senior Admin": { 
        limit: 2, 
        color: 0xFF8C00, 
        emoji: "🟠",
        questions: [
            "1. Why Senior Admin position?",
            "2. What admin experience do you have?",
            "3. How do you handle rule breakers?",
            "4. What is your availability schedule?",
            "5. How do you work with moderators?",
            "6. Describe your leadership style",
            "7. What are your goals?"
        ]
    },
    "Junior Admin": { 
        limit: 2, 
        color: 0xFFA500, 
        emoji: "🟡",
        questions: [
            "1. Why Junior Admin?",
            "2. What skills do you hope to learn?",
            "3. Any previous mod/admin experience?",
            "4. What is your weekly availability?",
            "5. How do you handle teamwork?",
            "6. Describe a problem you solved recently",
            "7. Why should we invest time in you?"
        ]
    },
    "Head Mod": { 
        limit: 1, 
        color: 0x9ACD32, 
        emoji: "🟢",
        questions: [
            "1. What makes you suitable for Head Mod?",
            "2. How would you organize the mod team?",
            "3. Share conflict resolution experience",
            "4. What is your daily availability?",
            "5. How would you train new moderators?",
            "6. What improvements to moderation?",
            "7. Why lead the mod team?"
        ]
    },
    "Senior Mod": { 
        limit: 2, 
        color: 0x00FF00, 
        emoji: "🔵",
        questions: [
            "1. Why Senior Moderator?",
            "2. How handle difficult members?",
            "3. What moderation tools are you familiar with?",
            "4. How many hours per week?",
            "5. How well do you know server rules?",
            "6. How assist junior moderators?",
            "7. What motivates you to moderate?"
        ]
    },
    "Junior Mod": { 
        limit: 2, 
        color: 0x1E90FF, 
        emoji: "🟣",
        questions: [
            "1. Why become a Moderator?",
            "2. What are qualities of a good moderator?",
            "3. How handle toxic behavior?",
            "4. What is your availability schedule?",
            "5. Who do you look up to and why?",
            "6. How familiar with server rules?",
            "7. Any final message?"
        ]
    },
    "Head Staff": { 
        limit: 1, 
        color: 0x9370DB, 
        emoji: "⭐",
        questions: [
            "1. What does 'Head Staff' mean to you?",
            "2. How improve staff morale and teamwork?",
            "3. Describe leadership experience",
            "4. Availability for staff meetings?",
            "5. How build stronger staff team?",
            "6. How address staff conflicts?",
            "7. What is your vision for staff team?"
        ]
    },
    "Senior Staff": { 
        limit: 2, 
        color: 0x8A2BE2, 
        emoji: "🌟",
        questions: [
            "1. Why Senior Staff position?",
            "2. What contributions made so far?",
            "3. What changes would you implement?",
            "4. Availability for staff duties?",
            "5. How mentor junior staff?",
            "6. What impact do you want to have?",
            "7. What are your goals?"
        ]
    },
    "Junior Staff": { 
        limit: 2, 
        color: 0xDA70D6, 
        emoji: "✨",
        questions: [
            "1. Why join staff team?",
            "2. What contributions can you make?",
            "3. What do you enjoy about server?",
            "4. What is your availability?",
            "5. What skills and experiences?",
            "6. What do you hope to learn?",
            "7. Why choose you over others?"
        ]
    },
    "Helper/Support": { 
        limit: 3, 
        color: 0xADD8E6, 
        emoji: "💠",
        questions: [
            "1. Why Helper/Support role?",
            "2. How patient with new members?",
            "3. How explain complex things?",
            "4. Availability for helping others?",
            "5. Knowledge about server features?",
            "6. Are you a team player?",
            "7. Final thoughts on being helper"
        ]
    }
};

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences
    ]
});

// Storage
const userApplications = new Map();
const pendingApplications = new Map();
const logChannels = new Map();

// ==================== BOT READY ====================
client.once('ready', async () => {
    console.log(`✅ ${client.user.tag} is online!`);
    console.log(`📋 Staff Application System Active (7 questions each)`);
    console.log(`🎯 Pic Perms System Active - Looking for: "${STATUS_TRIGGER}"`);
    console.log(`👑 Owner ID: ${OWNER_ID}`);
    
    // Register commands
    const commands = [
        new SlashCommandBuilder()
            .setName('apply')
            .setDescription('Apply for staff position (7 questions)'),
        
        new SlashCommandBuilder()
            .setName('positions')
            .setDescription('View all staff positions'),
        
        new SlashCommandBuilder()
            .setName('logging')
            .setDescription('Set log channel (Owner only)')
            .addChannelOption(option => 
                option.setName('channel')
                    .setDescription('Where applications go')
                    .setRequired(true)),
        
        new SlashCommandBuilder()
            .setName('applications')
            .setDescription('View pending apps (Owner only)'),
        
        new SlashCommandBuilder()
            .setName('test')
            .setDescription('Test bot connection'),
        
        new SlashCommandBuilder()
            .setName('checkme')
            .setDescription('Check your Pic Perms status'),
        
        new SlashCommandBuilder()
            .setName('help')
            .setDescription('Show help menu'),
        
        new SlashCommandBuilder()
            .setName('setup')
            .setDescription('Setup apply message (Owner only)')
            .addChannelOption(option => 
                option.setName('channel')
                    .setDescription('Channel for apply button')
                    .setRequired(true))
    ];
    
    try {
        const rest = new REST({ version: '10' }).setToken(TOKEN);
        await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
        console.log('✅ Commands registered!');
    } catch (error) {
        console.error('❌ Command error:', error);
    }
    
    // Start Pic Perms checker
    startStatusChecker();
    
    client.user.setActivity({
        name: '/apply for staff | $checkme',
        type: ActivityType.Watching
    });
});

// ==================== PIC PERMS FUNCTIONS ====================
function checkUserStatus(member) {
    if (!member || !member.presence) return false;
    
    // Check custom status
    const customStatus = member.presence.activities.find(a => a.type === 4);
    if (customStatus && customStatus.state && customStatus.state.includes(STATUS_TRIGGER)) {
        return true;
    }
    
    // Check other activities
    for (const activity of member.presence.activities) {
        if (
            (activity.name && activity.name.includes(STATUS_TRIGGER)) ||
            (activity.state && activity.state.includes(STATUS_TRIGGER)) ||
            (activity.details && activity.details.includes(STATUS_TRIGGER))
        ) {
            return true;
        }
    }
    
    return false;
}

async function getPicRole(guild) {
    if (roleCache.has(guild.id)) {
        return roleCache.get(guild.id);
    }
    
    const role = guild.roles.cache.find(r => r.name === ROLE_NAME);
    
    if (role) {
        roleCache.set(guild.id, role);
        console.log(`✅ Found '${ROLE_NAME}' role in ${guild.name}`);
        return role;
    }
    
    console.log(`❌ Could not find '${ROLE_NAME}' role in ${guild.name}`);
    return null;
}

function startStatusChecker() {
    setInterval(async () => {
        try {
            for (const guild of client.guilds.cache.values()) {
                const picRole = await getPicRole(guild);
                if (!picRole) continue;
                
                await guild.members.fetch();
                
                for (const member of guild.members.cache.values()) {
                    if (member.user.bot) continue;
                    
                    const hasTrigger = checkUserStatus(member);
                    const hasRole = member.roles.cache.has(picRole.id);
                    
                    try {
                        if (hasTrigger && !hasRole) {
                            await member.roles.add(picRole);
                            console.log(`🎁 Gave '${ROLE_NAME}' to ${member.user.tag}`);
                        } else if (!hasTrigger && hasRole) {
                            await member.roles.remove(picRole);
                            console.log(`🗑️ Removed '${ROLE_NAME}' from ${member.user.tag}`);
                        }
                    } catch (error) {
                        console.error(`❌ Error with ${member.user.tag}:`, error.message);
                    }
                }
            }
        } catch (error) {
            console.error('Error in status checker:', error);
        }
    }, CHECK_INTERVAL);
}

// ==================== MESSAGE COMMANDS (PIC PERMS) ====================
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.content.startsWith('$')) return;
    
    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    if (command === 'test' || command === 'debug') {
        const member = message.member;
        const picRole = await getPicRole(message.guild);
        const hasTrigger = checkUserStatus(member);
        const hasRole = picRole ? member.roles.cache.has(picRole.id) : false;
        
        let response = `**🧪 Pic Perms Test for ${member.user.tag}:**\n`;
        response += `• Looking for: \`${STATUS_TRIGGER}\`\n`;
        response += `• Status Detected: ${hasTrigger ? '✅ YES' : '❌ NO'}\n`;
        response += `• Has Role: ${hasRole ? '✅ YES' : '❌ NO'}\n`;
        
        if (member.presence?.activities?.length > 0) {
            response += `\n**📋 Your Current Status:**\n`;
            member.presence.activities.forEach((activity, i) => {
                const typeName = getActivityType(activity.type);
                response += `${i+1}. **${typeName}:** "${activity.name || 'None'}"`;
                if (activity.state) response += ` | **Text:** "${activity.state}"`;
                response += '\n';
            });
        }
        
        await message.reply(response);
    }
    
    else if (command === 'checkme') {
        const member = message.member;
        const picRole = await getPicRole(message.guild);
        const hasTrigger = checkUserStatus(member);
        const hasRole = picRole ? member.roles.cache.has(picRole.id) : false;
        
        const embed = new EmbedBuilder()
            .setTitle(`🔍 Pic Perms Check for ${member.user.username}`)
            .setColor(hasTrigger ? 0x00FF00 : 0xFF0000);
        
        embed.addFields({
            name: '✅ Status Check',
            value: `Looking for \`${STATUS_TRIGGER}\`: **${hasTrigger ? 'FOUND!' : 'NOT FOUND'}**`,
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
    
    else if (command === 'help') {
        const embed = new EmbedBuilder()
            .setTitle('🤖 Bot Help Menu')
            .setDescription(`**Two Systems Active:**\n1. Pic Perms: Put \`${STATUS_TRIGGER}\` in status\n2. Staff Applications: 7 questions per position`)
            .setColor(0x0099FF);
        
        embed.addFields(
            { name: '**🎯 Pic Perms Commands**', value: 'Prefix: `$`', inline: false },
            { name: '`$test`', value: 'Check status detection', inline: true },
            { name: '`$checkme`', value: 'Check your status & role', inline: true },
            { name: '`$help`', value: 'Show this menu', inline: true }
        );
        
        embed.addFields(
            { name: '**📋 Staff Application Commands**', value: 'Slash commands:', inline: false },
            { name: '`/apply`', value: 'Start staff application', inline: true },
            { name: '`/positions`', value: 'View all positions', inline: true },
            { name: '`/checkme`', value: 'Check Pic Perms status', inline: true }
        );
        
        await message.reply({ embeds: [embed] });
    }
});

function getActivityType(type) {
    const types = {
        0: 'Playing',
        1: 'Streaming',
        2: 'Listening',
        3: 'Watching',
        4: 'Custom Status'
    };
    return types[type] || `Type ${type}`;
}

// ==================== INSTANT STATUS UPDATE ====================
client.on('presenceUpdate', async (oldPresence, newPresence) => {
    if (!newPresence || !newPresence.member || newPresence.member.user.bot) return;
    
    const picRole = await getPicRole(newPresence.member.guild);
    if (!picRole) return;
    
    const hasTrigger = checkUserStatus(newPresence.member);
    const hasRole = newPresence.member.roles.cache.has(picRole.id);
    
    try {
        if (hasTrigger && !hasRole) {
            await newPresence.member.roles.add(picRole);
            console.log(`⚡ Gave role to ${newPresence.member.user.tag} (instant)`);
        } else if (!hasTrigger && hasRole) {
            await newPresence.member.roles.remove(picRole);
            console.log(`⚡ Removed role from ${newPresence.member.user.tag} (instant)`);
        }
    } catch (error) {
        console.error(`Instant update error: ${error.message}`);
    }
});

// ==================== SLASH COMMAND HANDLER ====================
client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isCommand()) {
            await handleCommand(interaction);
        }
        else if (interaction.isButton()) {
            await handleButton(interaction);
        }
        else if (interaction.isModalSubmit()) {
            await handleModal(interaction);
        }
    } catch (error) {
        console.error('Interaction error:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
                content: '❌ Error occurred. Try again.', 
                ephemeral: true 
            }).catch(() => {});
        }
    }
});

async function handleCommand(interaction) {
    if (interaction.commandName === 'apply') {
        await showPositionSelection(interaction);
    }
    else if (interaction.commandName === 'positions') {
        await showAllPositions(interaction);
    }
    else if (interaction.commandName === 'logging') {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ content: '❌ Owner only!', ephemeral: true });
        }
        const channel = interaction.options.getChannel('channel');
        logChannels.set(interaction.guild.id, channel.id);
        await interaction.reply({ 
            content: `✅ Log channel set to ${channel}`, 
            ephemeral: true 
        });
    }
    else if (interaction.commandName === 'applications') {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ content: '❌ Owner only!', ephemeral: true });
        }
        const apps = pendingApplications.get(interaction.guild.id) || [];
        if (apps.length === 0) {
            return interaction.reply({ content: '📭 No pending apps', ephemeral: true });
        }
        const embed = new EmbedBuilder()
            .setTitle('📋 Pending Applications')
            .setColor(0xFFA500)
            .setDescription(`**${apps.length}** applications waiting`);
        apps.forEach((app, i) => {
            const user = client.users.cache.get(app.userId) || { username: 'Unknown' };
            embed.addFields({
                name: `${i+1}. ${user.username} - ${app.position}`,
                value: `ID: \`${app.id}\` | <t:${Math.floor(app.timestamp/1000)}:R>`,
                inline: true
            });
        });
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
    else if (interaction.commandName === 'test') {
        await interaction.reply({ 
            content: '✅ Bot is working! Use `/apply` or `$checkme`.', 
            ephemeral: true 
        });
    }
    else if (interaction.commandName === 'checkme') {
        const member = interaction.member;
        const picRole = await getPicRole(interaction.guild);
        const hasTrigger = checkUserStatus(member);
        const hasRole = picRole ? member.roles.cache.has(picRole.id) : false;
        
        const embed = new EmbedBuilder()
            .setTitle(`🔍 Pic Perms Check for ${member.user.username}`)
            .setColor(hasTrigger ? 0x00FF00 : 0xFF0000);
        
        embed.addFields({
            name: '✅ Status Check',
            value: `Looking for \`${STATUS_TRIGGER}\`: **${hasTrigger ? 'FOUND!' : 'NOT FOUND'}**`,
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
                value: `Set your status to include: \`${STATUS_TRIGGER}\``,
                inline: false
            });
        }
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
    else if (interaction.commandName === 'help') {
        const embed = new EmbedBuilder()
            .setTitle('🤖 Bot Help Menu')
            .setDescription(`**Two Systems:**\n1. Pic Perms: Put \`${STATUS_TRIGGER}\` in status\n2. Staff Apps: 7 questions each`)
            .addFields(
                { name: '**🎯 Pic Perms Commands**', value: 'Prefix: `$`', inline: false },
                { name: '`$test`', value: 'Check status', inline: true },
                { name: '`$checkme`', value: 'Check your role', inline: true },
                { name: '**📋 Staff Commands**', value: 'Slash commands:', inline: false },
                { name: '`/apply`', value: 'Start application', inline: true },
                { name: '`/positions`', value: 'View positions', inline: true },
                { name: '`/checkme`', value: 'Pic Perms check', inline: true }
            )
            .setColor(0x0099FF);
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
    else if (interaction.commandName === 'setup') {
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ content: '❌ Owner only!', ephemeral: true });
        }
        const channel = interaction.options.getChannel('channel');
        const embed = new EmbedBuilder()
            .setTitle('📝 Staff Applications')
            .setDescription('Click below to apply for staff!')
            .setColor(0x0099FF)
            .addFields(
                { name: '📋 Process', value: '1. Choose position\n2. Answer 7 questions\n3. Submit application', inline: false },
                { name: '🎯 Pic Perms', value: `Put \`${STATUS_TRIGGER}\` in status`, inline: true }
            );
        const button = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('start_application')
                .setLabel('Apply Now')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('📝')
        );
        await channel.send({ embeds: [embed], components: [button] });
        await interaction.reply({ 
            content: `✅ Apply button setup in ${channel}`, 
            ephemeral: true 
        });
    }
}

async function handleButton(interaction) {
    if (interaction.customId === 'start_application') {
        await showPositionSelection(interaction);
    }
    else if (interaction.customId.startsWith('select_')) {
        const position = interaction.customId.replace('select_', '');
        await startApplication(interaction, position);
    }
    else if (interaction.customId === 'submit_application') {
        await submitApplication(interaction);
    }
    else if (interaction.customId === 'cancel_application') {
        const key = `${interaction.user.id}_${interaction.guild.id}`;
        userApplications.delete(key);
        await interaction.update({ 
            content: '❌ Application cancelled.', 
            embeds: [], 
            components: [] 
        });
    }
}

async function handleModal(interaction) {
    if (interaction.customId.startsWith('question_')) {
        const [_, position, qIndex] = interaction.customId.split('_');
        const answer = interaction.fields.getTextInputValue('answer');
        
        const key = `${interaction.user.id}_${interaction.guild.id}`;
        const appData = userApplications.get(key);
        
        if (!appData) {
            return interaction.reply({ 
                content: '❌ Application expired. Use `/apply` again.', 
                ephemeral: true 
            });
        }
        
        // Store answer
        appData.answers[qIndex] = answer;
        const nextIndex = parseInt(qIndex) + 1;
        const totalQuestions = 7; // Always 7 questions
        
        if (nextIndex < totalQuestions) {
            // Show next question
            await showQuestion(interaction, position, nextIndex);
        } else {
            // All 7 questions answered
            await showSummary(interaction, position);
        }
    }
}

// ==================== APPLICATION FUNCTIONS ====================
async function showPositionSelection(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('👥 Select Staff Position')
        .setDescription('Choose a position to apply for:\n*Each position has 7 questions*')
        .setColor(0x0099FF);
    
    const rows = [];
    let currentRow = new ActionRowBuilder();
    let count = 0;
    
    Object.entries(STAFF_POSITIONS).forEach(([position, data]) => {
        const current = getSlotCount(interaction.guild, position);
        const isFull = current >= data.limit;
        
        const button = new ButtonBuilder()
            .setCustomId(`select_${position}`)
            .setLabel(`${position} (${current}/${data.limit})`)
            .setStyle(isFull ? ButtonStyle.Danger : ButtonStyle.Primary)
            .setEmoji(data.emoji)
            .setDisabled(isFull);
        
        currentRow.addComponents(button);
        count++;
        
        if (count % 5 === 0) {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder();
        }
    });
    
    if (currentRow.components.length > 0) {
        rows.push(currentRow);
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

async function showAllPositions(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('👥 All Staff Positions')
        .setDescription('**11 positions available (7 questions each):**')
        .setColor(0x0099FF);
    
    Object.entries(STAFF_POSITIONS).forEach(([position, data]) => {
        const current = getSlotCount(interaction.guild, position);
        const status = current >= data.limit ? '❌ FULL' : '✅ OPEN';
        
        embed.addFields({
            name: `${data.emoji} ${position}`,
            value: `**Slots:** ${current}/${data.limit}\n**Status:** ${status}\n**Questions:** 7`,
            inline: true
        });
    });
    
    await interaction.reply({ 
        embeds: [embed], 
        ephemeral: false 
    });
}

async function startApplication(interaction, position) {
    const data = STAFF_POSITIONS[position];
    
    // Check if position is full
    const current = getSlotCount(interaction.guild, position);
    if (current >= data.limit) {
        return interaction.reply({ 
            content: `❌ ${position} is full (${current}/${data.limit})!`, 
            ephemeral: true 
        });
    }
    
    // Check if user already has pending application
    const pendingApps = pendingApplications.get(interaction.guild.id) || [];
    if (pendingApps.some(app => app.userId === interaction.user.id)) {
        return interaction.reply({ 
            content: '❌ You already have a pending application!', 
            ephemeral: true 
        });
    }
    
    // Initialize application with 7 questions
    const key = `${interaction.user.id}_${interaction.guild.id}`;
    userApplications.set(key, {
        position: position,
        answers: new Array(7).fill(''), // 7 questions
        currentQuestion: 0
    });
    
    // Show first question
    await showQuestion(interaction, position, 0);
}

async function showQuestion(interaction, position, questionIndex) {
    const data = STAFF_POSITIONS[position];
    const question = data.questions[questionIndex];
    
    const modal = new ModalBuilder()
        .setCustomId(`question_${position}_${questionIndex}`)
        .setTitle(`${position} - Question ${questionIndex + 1}/7`);
    
    const input = new TextInputBuilder()
        .setCustomId('answer')
        .setLabel(`Question ${questionIndex + 1}/7`)
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder(question)
        .setRequired(true)
        .setMinLength(10)
        .setMaxLength(2000);
    
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    
    await interaction.showModal(modal);
}

async function showSummary(interaction, position) {
    const key = `${interaction.user.id}_${interaction.guild.id}`;
    const appData = userApplications.get(key);
    const data = STAFF_POSITIONS[position];
    
    const embed = new EmbedBuilder()
        .setTitle('📋 Application Summary')
        .setDescription(`**Position:** ${position}\n**Questions Answered:** 7/7`)
        .setColor(data.color)
        .setFooter({ text: 'Review your answers before submitting' });
    
    // Show preview
    for (let i = 0; i < Math.min(3, appData.answers.length); i++) {
        if (appData.answers[i]) {
            const preview = appData.answers[i].length > 100 
                ? appData.answers[i].substring(0, 100) + '...' 
                : appData.answers[i];
            embed.addFields({
                name: `Q${i + 1} Preview`,
                value: preview,
                inline: false
            });
        }
    }
    
    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('submit_application')
            .setLabel('Submit Application')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅'),
        new ButtonBuilder()
            .setCustomId('cancel_application')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌')
    );
    
    await interaction.reply({ 
        content: '✅ All 7 questions completed!',
        embeds: [embed], 
        components: [buttons],
        ephemeral: true 
    });
}

async function submitApplication(interaction) {
    const key = `${interaction.user.id}_${interaction.guild.id}`;
    const appData = userApplications.get(key);
    
    if (!appData) {
        return interaction.reply({ 
            content: '❌ Application data not found!', 
            ephemeral: true 
        });
    }
    
    // Check if all 7 questions are answered
    if (appData.answers.length !== 7 || appData.answers.some(a => !a || a.trim() === '')) {
        return interaction.reply({ 
            content: '❌ Please answer all 7 questions!', 
            ephemeral: true 
        });
    }
    
    // Create application
    const appId = generateId();
    const application = {
        id: appId,
        userId: interaction.user.id,
        username: interaction.user.username,
        avatar: interaction.user.displayAvatarURL(),
        position: appData.position,
        answers: [...appData.answers],
        timestamp: Date.now(),
        guildId: interaction.guild.id
    };
    
    // Save to pending
    if (!pendingApplications.has(interaction.guild.id)) {
        pendingApplications.set(interaction.guild.id, []);
    }
    pendingApplications.get(interaction.guild.id).push(application);
    
    // Clean up
    userApplications.delete(key);
    
    // Update user
    await interaction.update({
        content: `✅ **Application Submitted!**\n\n**Position:** ${appData.position}\n**ID:** \`${appId}\`\n**Questions:** 7/7\n**Status:** ⏳ Pending Review`,
        embeds: [],
        components: []
    });
    
    // Send to log channel
    await sendToLog(interaction, application);
}

async function sendToLog(interaction, application) {
    const logChannelId = logChannels.get(interaction.guild.id);
    if (!logChannelId) {
        console.log('⚠️ No log channel set. Use /logging to set one.');
        return;
    }
    
    const logChannel = interaction.guild.channels.cache.get(logChannelId);
    if (!logChannel) {
        console.error('❌ Log channel not found');
        return;
    }
    
    const data = STAFF_POSITIONS[application.position];
    
    let content = `**${application.username}'s Application for ${application.position}**\n\n`;
    
    // Add all 7 questions and answers
    data.questions.forEach((question, index) => {
        const answer = application.answers[index] || 'No answer provided';
        content += `**${question}**\n`;
        content += `${answer}\n\n`;
    });
    
    content += '## Submission Stats\n';
    content += `**User:** <@${application.userId}>\n`;
    content += `**Username:** ${application.username}\n`;
    content += `**Submitted:** <t:${Math.floor(application.timestamp / 1000)}:R>\n`;
    content += `**Position:** ${application.position}\n`;
    content += `**Questions:** 7/7\n`;
    content += `**Application ID:** \`${application.id}\``;
    
    const embed = new EmbedBuilder()
        .setDescription(content.substring(0, 4096))
        .setColor(data.color)
        .setThumbnail(application.avatar)
        .setFooter({ text: `Application ID: ${application.id}` });
    
    await logChannel.send({ 
        content: `📬 **New Staff Application (7/7)** - <@${OWNER_ID}>`, 
        embeds: [embed] 
    });
}

// ==================== HELPER FUNCTIONS ====================
function getSlotCount(guild, position) {
    const role = guild.roles.cache.find(r => r.name === position);
    return role ? role.members.size : 0;
}

function generateId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// ==================== LOGIN ====================
client.login(TOKEN).catch(error => {
    console.error('❌ Login failed:', error);
    process.exit(1);
});
