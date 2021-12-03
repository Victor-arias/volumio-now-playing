import * as util from './../util.js';
import { registry } from './../registry.js';

export class QueueScreen {
  constructor(el) {
    this.el = el;

    const html = `
      <div class="contents">
        <div class="header">
          <div class="main-actions">
            <button class="action random"><i class="fa fa-random"></i></button>
            <button class="action repeat"><i class="fa fa-repeat"></i></button>
            <button class="action clear"><i class="fa fa-trash-o"></i></button>
          </div>
          <button class="action close"><i class="fa fa-times-circle"></i></button>
        </div>
        <div class="items-wrapper">
          <div class="items"></div>
        </div>
      </div>
    `;

    let screen = $(this.el);
    screen.html(html);
    screen.data('screenName', this.getScreenName());

    let self = this;
    let socket = registry.socket;
    socket.on('pushQueue', (data) => {
      self.setItems(data);
      self.showCurrentPlaying();
    });

    registry.state.on('stateChanged', () => {
      self.showCurrentPlaying();
      self.refreshActionButtons();
    })

    $('.header', screen).swipe({
      swipeDown: () => {
        registry.ui.actionPanel.show();
      }
    });

    $('.items', screen).on('click', '.item', function() {
      socket.emit('play', { value: $(this).data('position') });
    });

    $('.items', screen).on('click', 'button.remove', function() {
      let item = $(this).parents('.item');
      socket.emit('removeFromQueue', { value: item.data('position') });
    });

    $('.action.repeat', screen).on('click', () => {
      let state = registry.state.get();
      if (state == null) {
        return;
      }
      let repeat = state.repeat ? (state.repeatSingle ? false : true) : true;
      let repeatSingle = repeat && state.repeat;
      socket.emit('setRepeat', { value: repeat, repeatSingle });
    });

    $('.action.random', screen).on('click', () => {
      let state = registry.state.get();
      if (state == null) {
        return;
      }
      socket.emit('setRandom', { value: !state.random });
    });

    $('.action.clear', screen).on('click', function() {
      socket.emit('clearQueue');
    })

    $('.action.close', screen).on('click', function() {
      util.setActiveScreen(registry.screens.nowPlaying);
    })

    $(document).ready(() => {
      let supportsHover = !window.matchMedia('(hover: none)').matches;
      $('.items-wrapper', screen).overlayScrollbars({
        scrollbars: {
          autoHide: supportsHover ? 'leave' : 'scroll'
        }
      });
    })
  }

  static init(el) {
    return new QueueScreen(el);
  }

  getScreenName() {
    return 'queue';
  }

  getDefaultShowEffect() {
    return 'slideDown';
  }

  usesTrackBar() {
    return true;
  }

  setItems(data) {
    let self = this;
    let screen = $(self.el);
    let itemList = $('.items', screen);
    itemList.html('');
    data.forEach( (track, index) => {
      let item = self.createItem(track);
      item.attr('data-position', index);
      itemList.append(item);
    });
  }

  createItem(data) {
    let itemHtml = `
        <div class="item">
            <div class="albumart"></div>
            <div class="track-info">
                <span class="title"></span>
                <span class="artist-album"></span>
            </div>
            <div class="actions">
                <button class="remove"><i class="fa fa-times"></i></button>
            </div>
        </div>
      `;

    let item = $(itemHtml);

    // TODO: move to util
    if (data.albumart || !data.icon) {
      let fallbackImgSrc = registry.app.host + '/albumart';
      let albumartUrl = data.albumart || fallbackImgSrc;
      if (albumartUrl.startsWith('/')) {
        albumartUrl = registry.app.host + albumartUrl;
      }
      let fallbackImgJS = `onerror="if (this.src != '${ fallbackImgSrc }') this.src = '${ fallbackImgSrc }';"`;
      $('.albumart', item).html(`<img src="${ albumartUrl }" ${ fallbackImgJS }/>`);
    }
    else { // icon
      let iconHtml = `<div class="icon"><i class="${ data.icon }"></i></div>`;
      $('.albumart', item).html(iconHtml);
    }

    let trackInfo = $('.track-info', item);
    $('.title', trackInfo).text(data.title || data.name || '');

    let artistAlbum = data.artist || "";
    if (data.album) {
      artistAlbum += artistAlbum ? " - " : "";
      artistAlbum += data.album;
    }
    $('.artist-album', trackInfo).text(artistAlbum);

    return item;
  }

  showCurrentPlaying() {
    let state = registry.state.get();
    let screen = $(this.el);
    let current = $('.items .item.current', screen);
    let stateItem = $(`.items .item[data-position="${ state.position }"]`, screen);
    if (state === null || state.position == undefined || stateItem.length == 0) {
      current.removeClass('current playing');
      return;
    }
    if (state.position != current.data('position')) {
      current.removeClass('current playing');
      stateItem.addClass('current');
    }
    if (state.status == 'play') {
      stateItem.addClass('playing');
    }
    else {
      stateItem.removeClass('playing');
    }

    // TODO: move to current position
  }

  refreshActionButtons() {
    let state = registry.state.get();
    let screen = $(this.el);
    let repeatEl = $('.action.repeat', screen);
    if (state.repeat) {
      repeatEl.addClass('active');
      $('i', repeatEl).html(state.repeatSingle ? '1' : '');
    }
    else {
      repeatEl.removeClass('active');
      $('i', repeatEl).html('');
    }

    let randomEl = $('.action.random', screen);
    if (state.random) {
      randomEl.addClass('active');
    }
    else {
      randomEl.removeClass('active');
    }
  }
}
