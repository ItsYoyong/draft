document.addEventListener('DOMContentLoaded', function() {
    
    // --- GLOBAL CONSTANTS ---
    const MAX_SLOTS = 10;
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    // Today (Midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    const todayString = `${monthNames[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;

    // PH Holidays 2025 (Month-Day)
    const holidays = ["1-1", "1-29", "2-25", "4-9", "4-17", "4-18", "4-19", "5-1", "6-12", "8-21", "8-25", "11-1", "11-2", "11-30", "12-8", "12-24", "12-25", "12-30", "12-31"];

    // --- STATS ---
    let stats = JSON.parse(localStorage.getItem('uep_clinic_stats')) || { pending: 0, todayCount: 0, allTime: 0, lastDate: todayString };
    if (stats.lastDate !== todayString) {
        stats.todayCount = 0; 
        stats.lastDate = todayString;
        localStorage.setItem('uep_clinic_stats', JSON.stringify(stats));
    }
    const statPending = document.getElementById('statPending');
    const statToday = document.getElementById('statToday');
    const statAllTime = document.getElementById('statAllTime');
    if (statPending) {
        statPending.innerText = stats.pending;
        statToday.innerText = stats.todayCount;
        statAllTime.innerText = stats.allTime.toLocaleString();
    }

    function getSlotCounts() { return JSON.parse(localStorage.getItem('uep_slot_counts')) || {}; }

    // --- AUTH ---
    const profileLogout = document.getElementById('logoutBtn');
    if(profileLogout) profileLogout.addEventListener('click', () => { localStorage.removeItem('uep_current_session_user'); window.location.href = 'login.html'; });

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        if(localStorage.getItem('uep_current_session_user')) { window.location.href = 'home.html'; }
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const u = document.getElementById('loginUsername').value.trim();
            const p = document.getElementById('loginPassword').value.trim();
            const allUsers = JSON.parse(localStorage.getItem('uep_all_users')) || {};
            if (allUsers[u] && allUsers[u].password === p) {
                localStorage.setItem('uep_current_session_user', u);
                window.location.href = 'home.html';
            } else { alert("Invalid Credentials"); }
        });
    }

    const regForm = document.getElementById('registerForm');
    if(regForm) {
        regForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const u = document.getElementById('regUsername').value;
            const p = document.getElementById('regPassword').value;
            const fName = document.getElementById('regName').value;
            const id = document.getElementById('regID').value;
            let allUsers = JSON.parse(localStorage.getItem('uep_all_users')) || {};
            if(allUsers[u]) { alert("Username taken"); return; }
            allUsers[u] = { 
                username: u, password: p, fullName: fName, id: id, 
                email: "No Email", course: "No Course", address: "Catarman, N. Samar", birthday: "No Birthday",
                initials: fName.charAt(0).toUpperCase(), date: null, time: null, reason: "" 
            };
            localStorage.setItem('uep_all_users', JSON.stringify(allUsers));
            alert("Account Created!"); window.location.href = 'login.html';
        });
    }

    // --- BOOKING LOGIC ---
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        const calendarGrid = document.getElementById('calendarGrid');
        let selectedDateText = "";
        let selectedTimeText = "";

        function updateTimeButtons(dateKey) {
            const counts = getSlotCounts();
            const dateData = counts[dateKey] || {};
            document.querySelectorAll('.time-btn').forEach(btn => {
                const timeKey = btn.getAttribute('data-time');
                const current = dateData[timeKey] || 0;
                const span = btn.querySelector('.btn-count-text');
                if(span) span.innerText = `${current}/${MAX_SLOTS} slots`;
                if (current >= MAX_SLOTS) {
                    btn.disabled = true; btn.classList.remove('selected');
                    btn.style.backgroundColor = "#e0e0e0"; btn.style.borderColor = "#ccc";
                } else {
                    btn.disabled = false; btn.style.backgroundColor = ""; btn.style.borderColor = "";
                }
            });
        }

        if(calendarGrid) {
            const monthLabel = document.getElementById('currentMonthYear');
            const prevBtn = document.getElementById('prevMonth');
            const nextBtn = document.getElementById('nextMonth');
            let currentViewDate = new Date();

            function renderCalendar(date) {
                calendarGrid.innerHTML = '';
                const year = date.getFullYear();
                const month = date.getMonth();
                monthLabel.innerText = `${monthNames[month]} ${year}`;
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const firstDayIndex = new Date(year, month, 1).getDay();
                const daysInRealMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                const isBookingWindowOpen = today.getDate() >= (daysInRealMonth - 2);

                for (let x = firstDayIndex; x > 0; x--) { 
                    const spacer = document.createElement('div');
                    spacer.style.visibility = "hidden"; calendarGrid.appendChild(spacer); 
                }

                for(let i=1; i<=daysInMonth; i++) {
                    let day = document.createElement('div');
                    day.className = 'calendar-day';
                    day.innerText = i;
                    const checkDate = new Date(year, month, i);
                    checkDate.setHours(0,0,0,0);
                    const dayOfWeek = checkDate.getDay(); 
                    const dateString = `${month + 1}-${i}`;

                    let isDisabled = false;
                    let tooltip = "";

                    if (checkDate < today) { isDisabled = true; tooltip = "Past Date"; }
                    else if (dayOfWeek === 0 || dayOfWeek === 6) { isDisabled = true; tooltip = "Clinic Closed (Weekend)"; }
                    else if (holidays.includes(dateString)) { isDisabled = true; tooltip = "Holiday"; }
                    else if (checkDate.getMonth() !== today.getMonth()) {
                        if (!isBookingWindowOpen) { isDisabled = true; tooltip = "Next month booking not yet open."; }
                    }

                    if (isDisabled) { day.classList.add('disabled'); day.title = tooltip; }
                    else {
                        day.onclick = function() {
                            document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
                            this.classList.add('selected');
                            selectedDateText = `${monthNames[month]} ${i}, ${year}`;
                            document.getElementById('selectedDateDisplay').innerText = selectedDateText;
                            document.getElementById('slotStatusDisplay').style.display = 'none';
                            selectedTimeText = "";
                            document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected'));
                            updateTimeButtons(selectedDateText);
                        };
                    }
                    calendarGrid.appendChild(day);
                }
            }
            renderCalendar(currentViewDate);
            prevBtn.addEventListener('click', () => { currentViewDate.setMonth(currentViewDate.getMonth() - 1); renderCalendar(currentViewDate); });
            nextBtn.addEventListener('click', () => { currentViewDate.setMonth(currentViewDate.getMonth() + 1); renderCalendar(currentViewDate); });
        }

        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                if(this.disabled) return;
                if(!selectedDateText) { alert("Please select a date first."); return; }
                document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('selected'));
                this.classList.add('selected');
                selectedTimeText = this.getAttribute('data-time');
                const counts = getSlotCounts();
                const currentCount = (counts[selectedDateText] && counts[selectedDateText][selectedTimeText]) || 0;
                const percentage = (currentCount / MAX_SLOTS) * 100;
                const statusBox = document.getElementById('slotStatusDisplay');
                statusBox.style.display = 'block';
                document.getElementById('statusTextContent').innerText = `${currentCount} / ${MAX_SLOTS} Slots Taken (${Math.round(percentage)}%)`;
                const fill = document.getElementById('progressBarFill');
                fill.style.width = `${percentage}%`;
                if(percentage < 50) fill.style.backgroundColor = "#1a45a8";
                else if(percentage < 90) fill.style.backgroundColor = "#ffa50c";
                else fill.style.backgroundColor = "#ff4d4d";
            });
        });

        document.getElementById('confirmBtn').addEventListener('click', function() {
            const fName = document.getElementById('firstName').value;
            const lName = document.getElementById('lastName').value;
            const studentID = document.getElementById('studentID').value;
            const reason = document.getElementById('reason').value;
            if(!fName || !studentID || !selectedDateText || !selectedTimeText) { alert("Please complete the form."); return; }

            let counts = getSlotCounts();
            if(!counts[selectedDateText]) counts[selectedDateText] = {};
            if(!counts[selectedDateText][selectedTimeText]) counts[selectedDateText][selectedTimeText] = 0;
            if(counts[selectedDateText][selectedTimeText] >= MAX_SLOTS) { alert("Slot full. Please pick another."); updateTimeButtons(selectedDateText); return; }

            counts[selectedDateText][selectedTimeText]++;
            localStorage.setItem('uep_slot_counts', JSON.stringify(counts));

            let allUsers = JSON.parse(localStorage.getItem('uep_all_users')) || {};
            let sessionUser = localStorage.getItem('uep_current_session_user');
            if(sessionUser && allUsers[sessionUser]) {
                allUsers[sessionUser].fullName = `${fName} ${lName}`;
                allUsers[sessionUser].id = studentID;
                allUsers[sessionUser].date = selectedDateText;
                allUsers[sessionUser].time = selectedTimeText;
                allUsers[sessionUser].reason = reason;
                localStorage.setItem('uep_all_users', JSON.stringify(allUsers));
            }
            stats.pending++; stats.allTime++;
            if(selectedDateText === todayString) { stats.todayCount++; }
            localStorage.setItem('uep_clinic_stats', JSON.stringify(stats));
            alert("Appointment Set!"); window.location.href = 'profile.html';
        });
    }

    // --- PROFILE ---
    const dispName = document.getElementById('dispName');
    if(dispName) {
        const sessionUser = localStorage.getItem('uep_current_session_user');
        if(!sessionUser) { window.location.href = 'login.html'; return; }
        let allUsers = JSON.parse(localStorage.getItem('uep_all_users')) || {};
        let user = allUsers[sessionUser];
        if(user) {
            document.getElementById('dispName').innerText = user.fullName;
            document.getElementById('dispID').innerText = user.id;
            document.querySelector('.profile-avatar').innerText = user.initials;
            document.getElementById('dispEmail').innerText = user.email || "---";
            document.getElementById('dispCourse').innerText = user.course || "---";
            document.getElementById('dispAddress').innerText = user.address || "---";
            document.getElementById('dispBirthday').innerText = user.birthday || "---";

            if(user.date) {
                document.getElementById('dispDate').innerText = `${user.date} @ ${user.time}`;
                document.getElementById('dispReason').innerText = user.reason;
            } else { document.getElementById('dispDate').innerText = "No Appointment"; }

            // History
            const historyBody = document.getElementById('recentVisitsBody');
            if(historyBody) {
                if (user.history && user.history.length > 0) {
                    historyBody.innerHTML = "";
                    user.history.forEach(visit => {
                        historyBody.innerHTML += `<tr><td>${visit.date}</td><td>${visit.reason}</td><td class="status-completed">Completed</td></tr>`;
                    });
                } else {
                    if(user.date) historyBody.innerHTML = `<tr><td>${user.date}</td><td>${user.reason}</td><td style="color:#ffa50c; font-weight:bold;">Upcoming</td></tr>`;
                    else historyBody.innerHTML = `<tr><td colspan="3" style="text-align:center; opacity:0.7;">No recent visits.</td></tr>`;
                }
            }
        }

        // Edit
        const editBtn = document.getElementById('editProfileBtn');
        const modal = document.getElementById('editModal');
        const cancelBtn = document.getElementById('cancelEditBtn');
        const editForm = document.getElementById('editForm');
        if(editBtn) {
            editBtn.addEventListener('click', () => {
                document.getElementById('editName').value = user.fullName;
                document.getElementById('editEmail').value = user.email || "";
                document.getElementById('editCourse').value = user.course || "";
                document.getElementById('editAddress').value = user.address || "";
                document.getElementById('editBirthday').value = user.birthday || "";
                modal.classList.add('active');
            });
            cancelBtn.addEventListener('click', () => { modal.classList.remove('active'); });
            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                user.fullName = document.getElementById('editName').value;
                user.email = document.getElementById('editEmail').value;
                user.course = document.getElementById('editCourse').value;
                user.address = document.getElementById('editAddress').value;
                user.birthday = document.getElementById('editBirthday').value;
                allUsers[sessionUser] = user;
                localStorage.setItem('uep_all_users', JSON.stringify(allUsers));
                alert("Profile Updated!"); location.reload();
            });
        }
    }
});