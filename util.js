const JUGNU = require("./Client");
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  ComponentType,
  Message,
} = require("discord.js");
const { Queue } = require("distube");

/**
 *
 * @param {JUGNU} client
 */
module.exports = async (client) => {
  // code
  /**
   *
   * @param {Queue} queue
   */
  client.buttons = (state) => {
    let raw = new ActionRowBuilder().addComponents([
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("skip")
        //.setLabel("Skip")
        .setEmoji(client.config.emoji.skip)
        .setDisabled(state),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("pauseresume")
        //.setLabel("P/R")
        .setEmoji(client.config.emoji.pause_resume)
        .setDisabled(state),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("loop")
        //.setLabel("Loop")
        .setEmoji(client.config.emoji.loop)
        .setDisabled(state),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("stop")
        //.setLabel("Stop")
        .setEmoji(client.config.emoji.stop)
        .setDisabled(state),
      new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setCustomId("autoplay")
        //.setLabel("Autoplay")
        .setEmoji(client.config.emoji.autoplay)
        .setDisabled(state),
    ]);
    return raw;
  };

  client.editPlayerMessage = async (channel) => {
    let ID = client.temp.get(channel.guild.id);
    if (!ID) return;
    let playembed = channel.messages.cache.get(ID);
    if (!playembed) {
      playembed = await channel.messages.fetch(ID).catch((e) => {});
    }
    if (!playembed) return;
    if (client.config.options.nowplayingMsg == true) {
      playembed.delete().catch((e) => {});
    } else {
      let embeds = playembed?.embeds ? playembed?.embeds[0] : null;
      if (embeds) {
        playembed
          ?.edit({
            embeds: [
              embeds.setFooter({
                text: `⛔️ SONG & QUEUE ENDED!`,
                iconURL: channel.guild.iconURL({ dynamic: true }),
              }),
            ],
            components: [client.buttons(true)],
          })
          .catch((e) => {});
      }
    }
  };

  /**
   *
   * @param {Queue} queue
   * @returns
   */
  client.getQueueEmbeds = async (queue) => {
    let guild = client.guilds.cache.get(queue.textChannel.guildId);
    let quelist = [];
    var maxTracks = 10; //tracks / Queue Page
    let tracks = queue.songs;
    for (let i = 0; i < tracks.length; i += maxTracks) {
      let songs = tracks.slice(i, i + maxTracks);
      quelist.push(
        songs
          .map(
            (track, index) =>
              `\` ${i + ++index}. \` ** ${track.name.substring(0, 35)}** - \`${
                track.isLive
                  ? `LIVE STREAM`
                  : track.formattedDuration.split(` | `)[0]
              }\` \`${track.user.tag}\``
          )
          .join(`\n`)
      );
    }
    let limit = quelist.length <= 5 ? quelist.length : 5;
    let embeds = [];
    for (let i = 0; i < quelist.length; i++) {
      let desc = String(quelist[i]).substring(0, 2048);
      await embeds.push(
        new EmbedBuilder()
          .setAuthor({
            name: `Queue for ${guild.name}  -  [ ${tracks.length} Tracks ]`,
            iconURL: guild.iconURL({ dynamic: true }),
          })
          .addFields([
            {
              name: `**\` N. \` *${
                tracks.length > maxTracks
                  ? tracks.length - maxTracks
                  : tracks.length
              } other Tracks ...***`,
              value: `\u200b`,
            },
            {
              name: `**\` 0. \` __CURRENT TRACK__**`,
              value: `**${queue.songs[0].name.substring(0, 35)}** - \`${
                queue.songs[0].isLive
                  ? `LIVE STREAM`
                  : queue.songs[0].formattedDuration.split(` | `)[0]
              }\` \`${queue.songs[0].user.tag}\``,
            },
          ])
          .setColor(client.config.embed.color)
          .setDescription(desc)
      );
    }
    return embeds;
  };

  client.status = (queue) =>
    `Volume: ${queue.volume}% • Status : ${
      queue.paused ? "Paused" : "Playing"
    } • Loop:  ${
      queue.repeatMode === 2 ? `Queue` : queue.repeatMode === 1 ? `Song` : `Off`
    } •  Autoplay: ${queue.autoplay ? `On` : `Off`} `;

  // embeds
  /**
   *
   * @param {Guild} guild
   */
  client.queueembed = (guild) => {
    let embed = new EmbedBuilder()
      .setColor(client.config.embed.color)
      .setTitle(`__Queue list:__`);
       //.setDescription(\n\n ** There are \`0\` Songss in Queue ** \n\n),
      //.setThumbnail(guild.iconURL({ dynamic: true }))
      //.setFooter({
       //text: guild.name,
      //iconURL: guild.iconURL({ dynamic: true }),
     //})

    return embed;
  };

  /**
   *
   * @param {Guild} guild
   */
  client.playembed = (guild) => {
    let embed = new EmbedBuilder()
      .setColor(client.config.embed.color)
      .setTitle(`No song playing currently`)
      /*.setAuthor({
        name: `Join a Voice Channel and Type Song Link/Name to Play`,
        iconURL: client.user.displayAvatarURL(),
      })*/
      .setDescription(
        ` [Invite Now](${client.config.links.inviteURL}) | [Support Server](${client.config.links.DiscordServer}) | [Website](${client.config.links.Website})`
      )
      .setImage(
        guild.banner
          ? guild.bannerURL({ size: 4096 })
          : `https://media.discordapp.net/attachments/1059482897200975922/1078781169388224512/IMG_4137.jpg?width=1177&height=662`
      )
      //.setFooter({
        //text: guild.name,
        //iconURL: guild.iconURL(),
      //});

    return embed;
  };

  /**
   *
   * @param {Client} client
   * @param {Guild} guild
   * @returns
   */
  client.updateembed = async (client, guild) => {
    let data = await client.music.get(`${guild.id}.music`);
    if (!data) return;
    let musicchannel = guild.channels.cache.get(data.channel);
    if (!musicchannel) return;
    // play msg
    let playmsg = musicchannel.messages.cache.get(data.pmsg);
    if (!playmsg) {
      playmsg = await musicchannel.messages.fetch(data.pmsg).catch((e) => {});
    }
    // queue message
    let queuemsg = musicchannel.messages.cache.get(data.qmsg);
    if (!queuemsg) {
      queuemsg = await musicchannel.messages.fetch(data.qmsg).catch((e) => {});
    }
    if (!queuemsg || !playmsg) return;
    await playmsg
      .edit({
        embeds: [client.playembed(guild)],
        components: [client.buttons(true)],
      })
      .then(async (msg) => {
        await queuemsg
          .edit({ embeds: [client.queueembed(guild)] })
          .catch((e) => {});
      })
      .catch((e) => {});
  };

  // update queue
  /**
   *
   * @param {Queue} queue
   * @returns
   */
  client.updatequeue = async (queue) => {
    let guild = client.guilds.cache.get(queue.textChannel.guildId);
    if (!guild) return;
    let data = await client.music.get(`${guild.id}.music`);
    if (!data) return;
    let musicchannel = guild.channels.cache.get(data.channel);
    if (!musicchannel) return;
    let queueembed = musicchannel.messages.cache.get(data.qmsg);
    if (!queueembed) {
      queueembed = await musicchannel.messages
        .fetch(data.qmsg)
        .catch((e) => {});
    }
    if (!queueembed) return;
    let currentSong = queue.songs[0];
    let string = queue.songs
      ?.filter((t, i) => i < 10)
      ?.map((track, index) => {
        return `\` ${index + 1}. \` ** ${track.name.substring(0, 35)}** - \`${
          track.isLive ? `LIVE STREAM` : track.formattedDuration.split(` | `)[0]
        }\` \`${track.user.tag}\``;
      })
      ?.reverse()
      .join("\n");
    queueembed.edit({
      embeds: [
        new EmbedBuilder()
          .setColor(client.config.embed.color)
          .setAuthor({
            name: `Musico Queue  -  [ ${queue.songs.length} Tracks ]`,
            iconURL: client.user.displayAvatarURL({ dynamic: true }),
          })
          .setDescription(string.substring(0, 2048))
          .addFields([
            {
              name: `**\` 0. \`__Now Playing__**`,
              value: `**${currentSong.name.substring(0, 35)}** - \`${
                currentSong.isLive
                  ? `LIVE STREAM`
                  : currentSong.formattedDuration.split(` | `)[0]
              }\``,
            },
          ])
          //.setFooter({
           // text: guild.name,
            //iconURL: guild.iconURL({ dynamic: true }),
          //}),
      ],
    });
  };
  // update player
  /**
   *
   * @param {Queue} queue
   * @returns
   */
  client.updateplayer = async (queue) => {
    let guild = client.guilds.cache.get(queue.textChannel.guildId);
    if (!guild) return;
    let data = await client.music.get(`${guild.id}.music`);
    if (!data) return;
    let musicchannel = guild.channels.cache.get(data.channel);
    if (!musicchannel) return;
    let playembed = musicchannel.messages.cache.get(data.pmsg);
    if (!playembed) {
      playembed = await musicchannel.messages.fetch(data.pmsg).catch((e) => {});
    }
    if (!playembed || !playembed.id) return;
    let track = queue.songs[0];
    if (!track.name) queue.stop();
    playembed.edit({
      embeds: [
        new EmbedBuilder()
          .setColor(client.config.embed.color)
          .setImage(track.thumbnail)
          .setTitle(track?.name)
          .setURL('https://discord.gg/vZnE8Dwx8t')
          //.setURL(track.url)
          .addFields([
            {
              name: `** Requested By **`,
              value: `\`${track.user.tag}\``,
              inline: true,
            },
            {
              name: `** Author **`,
              value: `\`${track.uploader.name || "😏"}\``,
              inline: true,
            },
            {
              name: `** Duration **`,
              value: `\`${track.formattedDuration}\``,
              inline: true,
            },
          ])
          //.setFooter(client.getFooter(track.user)),
      ],
      components: [client.buttons(false)],
    });
  };

  client.joinVoiceChannel = async (guild) => {
    let db = await client.music?.get(`${guild.id}.vc`);
    if (!db?.enable) return;
    if (!guild.members.me.permissions.has(PermissionFlagsBits.Connect)) return;
    let voiceChannel = guild.channels.cache.get(db.channel);
    setTimeout(() => {
      client.distube.voices.join(voiceChannel);
    }, 2000);
  };
  /**
   *
   * @param {Message} message
   */
  client.handleHelpSystem = async (message) => {
    // code
    const send = message?.deferred
      ? message.followUp.bind(message)
      : message.reply.bind(message);
    const user = message.member.user;
    // for commands
    const commands = message?.author ? client.mcommands : client.commands;
    // for categories
    const categories = message?.author
      ? client.mcategories
      : client.scategories;

    const emoji = {
      Information: "<:info:1074480786994114591>",
      Music: "<:musicnew:1074480749304086569>",
      Settings: "<:settings:1074480731117592670>",
    };

    let allcommands = client.mcommands.size;
    let allguilds = client.guilds.cache.size;
    let botuptime = `<t:${Math.floor(
      Date.now() / 1000 - client.uptime / 1000
    )}:R>`;
    let buttons = [
      new ButtonBuilder()
        .setCustomId("home")
        .setLabel("Menu")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:menu:1074480578910503124>"),
      categories
        .map((cat) => {
          return new ButtonBuilder()
            .setCustomId(cat)
            .setLabel(cat)
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(emoji[cat]);
        })
        .flat(Infinity),
    ].flat(Infinity);
    let row = new ActionRowBuilder().addComponents(buttons);

    let help_embed = new EmbedBuilder()
      .setColor(client.config.embed.color)
      .setAuthor({
        name: `Musico-Bot | Help Menu`,
        iconURL: client.user.displayAvatarURL({ dynamic: true }),
      })
      //.setTitle(`Musico-Bot | Help Menu`)
      .setThumbnail(client.user.avatarURL({ dynamic: true }))
      .setDescription(
        ` The perfect music bot with a song request channel, 24/7 System, 15+ filters, Support more than 700 platforms, all features are free!  `
      )
      .addFields([
        {
          name: `Command Categories`,
          value: `>>> ** <:menu:1074480578910503124> : \ Menu \n <:musicnew:1074480749304086569> : \ Music \n <:info:1074480786994114591> : \ Information \n <:settings:1074480731117592670> : \ Settings \n Choose category below to see commands.**`,
        },
      ])
      .setFooter(client.getFooter(user));

    let main_msg = await send({
      embeds: [help_embed],
      components: [row],
    });

    let filter = async (i) => {
      if (i.user.id === user.id) {
        return true;
      } else {
        await i.deferReply().catch((e) => {});
        i.followUp({
          content: `Not Your Interaction !!`,
          ephemeral: true,
        });
        return false;
      }
    };
    let colector = await main_msg.createMessageComponentCollector({
      filter: filter,
      componentType: ComponentType.Button,
    });
    colector.on("collect", async (i) => {
      if (i.isButton()) {
        await i.deferUpdate().catch((e) => {});
        let directory = i.customId;
        if (directory == "home") {
          main_msg.edit({ embeds: [help_embed] }).catch((e) => {});
        } else {
          main_msg
            .edit({
              embeds: [
                new EmbedBuilder()
                  .setColor(client.config.embed.color)
                  .setTitle(
                    `${emoji[directory]} ${directory} Commands`
                  )
                  .setDescription(
                    `>>> ${commands
                      .filter((cmd) => cmd.category === directory)
                      .map((cmd) => `\`${cmd.name}\``)
                      .join(",  ")}`
                  )
                  .setThumbnail(client.user.displayAvatarURL())
              ],
            })
            .catch((e) => null);
        }
      }
    });

    colector.on("end", async (c, i) => {
      row.components.forEach((c) => c.setDisabled(true));
      main_msg.edit({ components: [row] }).catch((e) => {});
    });
  };
};
