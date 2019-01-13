import angular from 'angular'
window.angular = angular
import moment from 'moment/src/moment'
window.moment = moment

import './sass/styles.scss'

const app = angular.module('bstm', []);
app.controller('MainController', [
  '$scope',
  '$window',
  '$interval',
  function ($scope, $window, $interval) {
    const vm = this
    
    const onLoad = () => {
      const data = $window.localStorage.getItem('time-tracker') || '{}'
      try {
        vm.tracker = JSON.parse(data)
      } catch {
        vm.tracker = {}
      }
    }

    const saveData = () => {
      $window.localStorage.setItem('time-tracker', JSON.stringify(vm.tracker))
    }

    vm.addCategory = () => {
      vm.tracker.categories = vm.tracker.categories || []
      vm.tracker.categories.push({
        name: '',
        segments: []
      })
      saveData()
    }

    vm.startTracking = category => {
      category.segments = category.segments || []
      category.segments.push({
        start: Date.now()
      })
      saveData()
    }

    vm.endTracking = category => {
      category.segments.filter(x => !x.end).forEach(x => x.end = Date.now())
      saveData()
    }

    vm.currentlyTracking = category => category.segments.some(x => !x.end)

    vm.segmentTime = segment => {
      const end = segment.end ? segment.end : Date.now()
      return formatDiff(moment(end).diff(moment(segment.start), 'seconds'))
    }

    vm.formatDate = segment => moment(segment.start).format('MM/DD/YYYY HH:mm')

    const formatDiff = time => {
      if (time < 60) {
        return `${time}s`
      } else if (time < 3600) {
        return `${Math.floor(time/60)}m ${time%60}s`
      } else {
        return `${Math.floor(time/3600)}h ${Math.floor((time%3600)/60)}m ${time%60}s`
      }
    }

    onLoad()
  }
])

angular.module('bstm').directive('bstmAudio', [
  function () {
    return {
      restrict: 'A',
      link: ($scope, element, attrs) => {
      }
    };
  }
]);
