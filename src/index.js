import angular from 'angular'
window.angular = angular

import moment from 'moment/src/moment'
window.moment = moment

import * as firebase from 'firebase/app'
import 'firebase/database'
import 'firebase/auth'
window.firebase = firebase

import './sass/styles.scss'

const app = angular.module('bstm', []);
app.controller('MainController', [
  '$scope',
  '$q',
  '$interval',
  '$window',
  function ($scope, $q, $interval, $window) {
    const vm = this
    let myChange = false
    const wakingSecondsPerDay = 57600
    const wakingSecondsPerWeek = 403200
    vm.changeMe = 0
    vm.tracker = {
      categories: []
    }
    vm.lists = {
      months: moment.months()
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

      authGoogle().then(user => {
        vm.ref = firebase.database().ref(user.uid);
  
        vm.ref.on('value', snapshot => {
          const val = snapshot.val()
          vm.tracker.categories = val.categories
          
          if (!myChange) {
            $scope.$digest()
          } else {
            myChange = false
          }
        })

        populateLists()

        $interval(() => {
          vm.changeMe = vm.changeMe + Math.floor((Math.random() * 200) - 100)
        }, 1000)
      })
    }

    const authGoogle = () => {
      const defer = $q.defer()
      firebase.auth().onAuthStateChanged(user => {
        if (user) {
          defer.resolve(user)
        } else {
          const provider = new firebase.auth.GoogleAuthProvider();
          firebase.auth().signInWithPopup(provider).then(result => {
            // This gives you a Google Access Token. You can use it to access the Google API.
            // var token = result.credential.accessToken;
            defer.resolve(result.user)
          })
        }
      });
      return defer.promise
    }

    const populateLists = () => {
      vm.lists.days = []
      for (let i = 1; i <= 31; i++) {
        vm.lists.days.push(i)
      }

      vm.lists.hours = []
      for (let i = 0; i <= 23; i++) {
        vm.lists.hours.push(i)
      }

      vm.lists.minutes = []
      vm.lists.seconds = []
      for (let i = 0; i <= 59; i++) {
        vm.lists.minutes.push(i)
        vm.lists.seconds.push(i)
      }
    }

    const saveData = () => {
      myChange = true
      vm.tracker.categories.forEach(x => delete x.$$hashKey)
      vm.ref.set(vm.tracker)
    }

    vm.categoryOrder = predicate => category => {
      if (!!category.segments && category.segments.length > 0) {
        return category.segments.reduce((total, segment) => total + diffTime((segment.end ? segment.end : Date.now()), segment.start), 0)
      } else {
        return 0
      }
    }

    vm.addCategory = () => {
      vm.tracker.categories = vm.tracker.categories || []
      vm.tracker.categories.push({
        name: '',
        segments: []
      })
      saveData()
    }

    const confirmWithAlert = (confirm, deny = () => {}, message = 'Are you sure you want to do this?') => {
      $window.confirm(message) ? confirm() : deny()
    };

    vm.removeCategory = category => {
      confirmWithAlert(() => {
        const index = vm.tracker.categories.indexOf(category)
        vm.tracker.categories.splice(index, 1)
      }, () => {}, `Are you sure you want to delete this category? It has ${category.segments ? category.segments.length : 0} segments.`)
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

    vm.percentageOfDay = category => `${Math.floor(totalSecondsToday(category) / wakingSecondsPerDay * 10000) / 100}%`

    // Weekly
    const isTimeThisWeek = time => moment(time) > moment().day(0)
    const totalSecondsThisWeek = category => {
      return category.segments.reduce((total, segment) => {
        if (isTimeThisWeek(segment.start)) {
          total = total + diffTime((segment.end ? segment.end : Date.now()), segment.start)
        }
        return total
      }, 0)
    }

    vm.totalTimeThisWeek = category => {
      let totalSeconds = totalSecondsThisWeek(category)
      return formatSeconds(totalSeconds)
    }

    vm.percentageOfWeek = category => `${Math.floor(totalSecondsThisWeek(category) / wakingSecondsPerWeek * 10000) / 100}%`

    vm.closeModal = () => {
      vm.showingModal = false
      vm.activeCategory = null
    }

    vm.openAddSegmentModal = category => {
      vm.showingModal = true
      vm.activeCategory = category
      const now = moment(Date.now())
      vm.newSegment = {
        start: {
          month: now.format('MMMM'),
          day: +now.format('D'),
          hour: +now.format('H'),
          minute: +now.format('m'),
          second: +now.format('s'),
        },
        end: {
          month: now.format('MMMM'),
          day: +now.format('D'),
          hour: +now.format('H'),
          minute: +now.format('m'),
          second: +now.format('s'),
        }
      }
    }

    const newSegmentMoment = (time) => {
      return moment(`2019 ${time.month} ${time.day} ${time.hour} ${time.minute} ${time.second}`, 'YYYY MMMM D H m s')
    }

    vm.newSegmentLength = () => {
      return formatSeconds(newSegmentMoment(vm.newSegment.end).diff(newSegmentMoment(vm.newSegment.start), 'seconds'))
    }

    vm.addSegment = () => {
      vm.activeCategory.segments = vm.activeCategory.segments || []
      vm.activeCategory.segments.push({
        start: parseInt(newSegmentMoment(vm.newSegment.start).format('x')),
        end: parseInt(newSegmentMoment(vm.newSegment.end).format('x'))
      })
      vm.closeModal()
      saveData()
    }

    vm.removeSegment = (category, segment) => {
      const index = category.segments.indexOf(segment)
      category.segments.splice(index, 1)
      saveData()
    }

    vm.activeCategoryAsArray = () => vm.activeCategory ? [vm.activeCategory] : []

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
