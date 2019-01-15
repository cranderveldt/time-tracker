import angular from 'angular'
window.angular = angular

import moment from 'moment/src/moment'
window.moment = moment

import * as firebase from 'firebase/app'
import 'firebase/database'
window.firebase = firebase

import './sass/styles.scss'

const app = angular.module('bstm', []);
app.controller('MainController', [
  '$scope',
  '$window',
  '$interval',
  function ($scope, $window, $interval) {
    const vm = this
    let myChange = false
    const wakingSeconds = 57600
    vm.changeMe = 0
    vm.tracker = {
      categories: []
    }
    
    const onLoad = () => {
      const config = {
        apiKey: "AIzaSyCwKUIOPO3eNc2ZXwtstAUqAvHEkZNW7Q0",
        authDomain: "af-time-tracker.firebaseapp.com",
        databaseURL: "https://af-time-tracker.firebaseio.com",
        projectId: "af-time-tracker",
        storageBucket: "af-time-tracker.appspot.com",
        messagingSenderId: "72270102750"
      };
      firebase.initializeApp(config);
      vm.ref = firebase.database().ref('user1');

      vm.ref.on('value', snapshot => {
        const val = snapshot.val()
        vm.tracker.categories = val.categories
        
        if (!myChange) {
          $scope.$digest()
        } else {
          myChange = false
        }
      })

      $interval(() => {
        vm.changeMe = vm.changeMe + Math.floor((Math.random() * 200) - 100)
      }, 1000)
    }

    const saveData = () => {
      myChange = true
      vm.ref.set(vm.tracker)
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

    vm.currentlyTracking = category => {
      return !!category.segments && category.segments.some(x => !x.end)
    }

    vm.segmentTime = segment => {
      const end = segment.end ? segment.end : Date.now()
      return formatSeconds(diffTime(end, segment.start))
    }

    vm.anySegments = category => !!category && !!category.segments && category.segments.length > 0
    vm.formatDate = segment => moment(segment.start).format('MM/DD/YYYY HH:mm')

    const formatSeconds = time => {
      if (time < 60) {
        return `${time}s`
      } else if (time < 3600) {
        return `${Math.floor(time/60)}m ${time%60}s`
      } else {
        return `${Math.floor(time/3600)}h ${Math.floor((time%3600)/60)}m ${time%60}s`
      }
    }

    const diffTime = (end, start) => moment(end).diff(moment(start), 'seconds')
    const isTimeToday = time => moment(time).format('MM/DD/YYYY') === moment(Date.now()).format('MM/DD/YYYY')
    const totalSecondsToday = category => {
      return category.segments.reduce((total, segment) => {
        if (isTimeToday(segment.start)) {
          total = total + diffTime((segment.end ? segment.end : Date.now()), segment.start)
        }
        return total
      }, 0)
    }

    vm.totalTimeToday = category => {
      let totalSeconds = totalSecondsToday(category)
      return formatSeconds(totalSeconds)
    }

    vm.percentageOfDay = category => `${Math.floor(totalSecondsToday(category) / wakingSeconds * 10000) / 100}%`

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
